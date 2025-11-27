import { test, expect } from '../fixtures';
import { loadGcpSecrets } from '../../scripts/load-dotenv-from-gcp';

test.describe('Load GCP Secrets Script', () => {
    let mockSecretManagerServiceClient: any;
    let mockLog: any;
    let mockError: any;
    let mockExit: any;
    let logs: string[] = [];
    let errors: string[] = [];
    let exitCode: number | undefined;

    test.beforeEach(() => {
        logs = [];
        errors = [];
        exitCode = undefined;

        mockLog = (...args: any[]) => logs.push(args.join(' '));
        mockError = (...args: any[]) => errors.push(args.join(' '));
        mockExit = (code: number) => { exitCode = code; };

        mockSecretManagerServiceClient = class {
            async accessSecretVersion(request: any) {
                if (request.name.includes('latest')) {
                    return [{
                        payload: {
                            data: Buffer.from('KEY=VALUE\nANOTHER=ONE')
                        }
                    }];
                }
                throw new Error('Secret not found');
            }
        };
    });

    test('should load secrets correctly', async () => {
        const envConfig = await loadGcpSecrets('test-project', 'test-secret', {
            deps: {
                SecretManagerServiceClient: mockSecretManagerServiceClient,
                log: mockLog,
                error: mockError,
                exit: mockExit
            }
        });

        expect(envConfig).toBeDefined();
        expect(envConfig!['KEY']).toBe('VALUE');
        expect(envConfig!['ANOTHER']).toBe('ONE');
        expect(process.env.KEY).toBe('VALUE');
        expect(process.env.ANOTHER).toBe('ONE');
    });

    test('should handle missing credentials', async () => {
        mockSecretManagerServiceClient = class {
            async accessSecretVersion() {
                const error: any = new Error('Could not load the default credentials');
                error.code = 16;
                throw error;
            }
        };

        await loadGcpSecrets('test-project', 'test-secret', {
            deps: {
                SecretManagerServiceClient: mockSecretManagerServiceClient,
                log: mockLog,
                error: mockError,
                exit: mockExit
            }
        });

        expect(errors.some(e => e.includes('Google Cloud Credentials not found'))).toBe(true);
        expect(exitCode).toBe(1);
    });

    test('should throw other errors', async () => {
        mockSecretManagerServiceClient = class {
            async accessSecretVersion() {
                throw new Error('Permission Denied');
            }
        };

        await expect(loadGcpSecrets('test-project', 'test-secret', {
            deps: {
                SecretManagerServiceClient: mockSecretManagerServiceClient,
                log: mockLog,
                error: mockError,
                exit: mockExit
            }
        })).rejects.toThrow('Permission Denied');
    });
});
