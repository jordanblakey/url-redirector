import { test, expect } from '../fixtures';
import { submitCws } from '../../scripts/submit-cws';
import path from 'path';

test.describe('CWS Submission Script', () => {
    let mockExecSync: any;
    let mockFetch: any;
    let mockLog: any;
    let mockWarn: any;
    let mockLoadSecrets: any;
    let mockFs: any;
    let logs: string[] = [];
    let warns: string[] = [];
    let executedCommands: string[] = [];
    let fetchCalls: any[] = [];

    test.beforeEach(() => {
        logs = [];
        warns = [];
        executedCommands = [];
        fetchCalls = [];

        mockLog = (...args: any[]) => logs.push(args.join(' '));
        mockWarn = (...args: any[]) => warns.push(args.join(' '));

        mockExecSync = (cmd: string, options: any) => {
            executedCommands.push(cmd);
            return Buffer.from('');
        };

        mockFetch = async (url: string, options: any) => {
            fetchCalls.push({ url, options });
            return {
                ok: true,
                json: async () => ({ access_token: 'fake_token', id: 'fake_id' }),
                text: async () => 'ok'
            };
        };

        mockLoadSecrets = async () => {
            // Do nothing, just mock
        };

        mockFs = {
            existsSync: (path: string) => true,
            createReadStream: (path: string) => 'fake_stream',
            readJsonSync: (path: string) => ({ version: '1.0.0' }),
            // Add other methods if needed, but these are the ones used
        };

        // Mock env vars
        process.env.CWS_CLIENT_ID = 'fake_client_id';
        process.env.CWS_CLIENT_SECRET = 'fake_client_secret';
        process.env.CWS_REFRESH_TOKEN = 'fake_refresh_token';
    });

    test('Dry Run: should not call fetch or git push', async () => {
        await submitCws({
            dryRun: true,
            deps: {
                execSync: mockExecSync,
                fetch: mockFetch,
                log: mockLog,
                warn: mockWarn,
                loadGcpSecrets: mockLoadSecrets,
                fs: mockFs
            }
        });

        // Check logs
        expect(logs.some(l => l.includes('DRY RUN'))).toBe(true);
        expect(logs.some(l => l.includes('Skipping Upload and Publish'))).toBe(true);
        expect(logs.some(l => l.includes('Skipping Git Tag and Push'))).toBe(true);
        expect(logs.some(l => l.includes('Run with --submit to actually publish'))).toBe(true);

        // Check commands
        expect(executedCommands).toContain('npm run bundle');
        expect(executedCommands.some(cmd => cmd.includes('git push'))).toBe(false);

        // Check fetch
        expect(fetchCalls.length).toBe(0);
    });

    test('Submit Mode: should call fetch and git push', async () => {
        await submitCws({
            dryRun: false,
            deps: {
                execSync: mockExecSync,
                fetch: mockFetch,
                log: mockLog,
                warn: mockWarn,
                loadGcpSecrets: mockLoadSecrets,
                fs: mockFs
            }
        });

        // Check logs
        expect(logs.some(l => l.includes('SUBMIT MODE'))).toBe(true);
        expect(logs.some(l => l.includes('Authenticating with CWS'))).toBe(true);

        // Check commands
        expect(executedCommands).toContain('npm run bundle');
        expect(executedCommands.some(cmd => cmd.includes('git tag'))).toBe(true);
        expect(executedCommands).toContain('git push && git push --tags');

        // Check fetch
        expect(fetchCalls.length).toBeGreaterThan(0);
        expect(fetchCalls.some(c => c.url.includes('oauth2'))).toBe(true);
        expect(fetchCalls.some(c => c.url.includes('upload'))).toBe(true);
        expect(fetchCalls.some(c => c.url.includes('publish'))).toBe(true);
    });

    test('Error Handling: should fail if upload fails', async () => {
        mockFetch = async (url: string) => {
            if (url.includes('upload')) {
                return {
                    ok: false,
                    status: 500,
                    text: async () => 'Upload Error'
                };
            }
            return {
                ok: true,
                json: async () => ({ access_token: 'fake_token' })
            };
        };

        await expect(submitCws({
            dryRun: false,
            deps: {
                execSync: mockExecSync,
                fetch: mockFetch,
                log: mockLog,
                warn: mockWarn,
                loadGcpSecrets: mockLoadSecrets,
                fs: mockFs
            }
        })).rejects.toThrow('Failed to upload extension: 500 Upload Error');
    });
});
