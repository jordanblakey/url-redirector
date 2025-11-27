import { test, expect } from './coverage-fixture';
import { runCheckStatus } from '../../scripts/check-cws-status';

test.describe('Check CWS Status Script', () => {
    let mockLoadSecrets: any;
    let mockFetch: any;
    let mockLog: any;
    let mockDir: any;
    let mockError: any;
    let logs: string[] = [];
    let dirs: any[] = [];
    let errors: any[] = [];
    let fetchCalls: any[] = [];

    test.beforeEach(() => {
        logs = [];
        dirs = [];
        errors = [];
        fetchCalls = [];

        mockLog = (...args: any[]) => logs.push(args.join(' '));
        mockDir = (obj: any) => dirs.push(obj);
        mockError = (...args: any[]) => errors.push(args);

        mockLoadSecrets = async () => {
            // Mock env vars
            process.env.CWS_CLIENT_ID = 'fake_client_id';
            process.env.CWS_CLIENT_SECRET = 'fake_client_secret';
            process.env.CWS_REFRESH_TOKEN = 'fake_refresh_token';
        };

        mockFetch = async (url: string, options: any) => {
            fetchCalls.push({ url, options });
            if (url.includes('oauth2')) {
                return {
                    ok: true,
                    json: async () => ({ access_token: 'fake_access_token' })
                };
            }
            if (url.includes('fetchStatus')) {
                return {
                    ok: true,
                    json: async () => ({ status: 'OK', detail: 'Published' })
                };
            }
            return { ok: false, status: 404, text: async () => 'Not Found' };
        };
    });

    test('should check status correctly', async () => {
        await runCheckStatus({
            deps: {
                loadGcpSecrets: mockLoadSecrets,
                fetch: mockFetch,
                log: mockLog,
                dir: mockDir,
                error: mockError
            }
        });

        // Check logs
        expect(logs.some(l => l.includes('Loading secrets'))).toBe(true);
        expect(logs.some(l => l.includes('Fetching access token'))).toBe(true);
        expect(logs.some(l => l.includes('Checking extension status'))).toBe(true);

        // Check fetch calls
        expect(fetchCalls.some(c => c.url.includes('oauth2'))).toBe(true);
        expect(fetchCalls.some(c => c.url.includes('fetchStatus'))).toBe(true);

        // Check output
        expect(dirs.length).toBeGreaterThan(0);
        expect(dirs[0]).toEqual({ status: 'OK', detail: 'Published' });
    });

    test('should handle auth failure', async () => {
        mockFetch = async (url: string) => {
            if (url.includes('oauth2')) {
                return {
                    ok: false,
                    status: 401,
                    text: async () => 'Unauthorized'
                };
            }
            return { ok: true };
        };

        // Mock process.exit
        const originalExit = process.exit;
        let exitCode: number | undefined;
        process.exit = ((code?: number) => {
            exitCode = code;
            throw new Error('Process Exited');
        }) as any;

        try {
            await runCheckStatus({
                deps: {
                    loadGcpSecrets: mockLoadSecrets,
                    fetch: mockFetch,
                    log: mockLog,
                    dir: mockDir,
                    error: mockError
                }
            });
        } catch (e: any) {
            expect(e.message).toBe('Process Exited');
        } finally {
            process.exit = originalExit;
        }

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0][0].message).toContain('Failed to get access token: 401 Unauthorized');
        expect(exitCode).toBe(1);
    });
});
