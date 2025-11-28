import { test, expect, describe, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { loadGcpSecrets } from '../../../scripts/load-dotenv-from-gcp';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

describe('Load GCP Secrets Script', () => {
  let mockSecretManagerServiceClient: typeof SecretManagerServiceClient;
  let mockLog: (...args: any[]) => void;
  let mockError: (...args: any[]) => void;
  let mockExit: any;
  let logs: string[] = [];
  let errors: string[] = [];
  let exitCode: number | undefined;

  beforeEach(() => {
    logs = [];
    errors = [];
    exitCode = undefined;

    mockLog = (...args: any[]) => logs.push(args.join(' '));
    mockError = (...args: any[]) => errors.push(args.join(' '));
    mockExit = (code?: number) => {
      exitCode = code;
    };

    mockSecretManagerServiceClient = class extends SecretManagerServiceClient {
      accessSecretVersion = vi.fn().mockImplementation(async (request: any) => {
        if (request.name.includes('latest')) {
          return [
            {
              payload: {
                data: Buffer.from('KEY=VALUE\nANOTHER=ONE'),
              },
            },
          ];
        }
        throw new Error('Secret not found');
      });
    } as any;
  });

  test('should load secrets correctly', async () => {
    const envConfig = await loadGcpSecrets('test-project', 'test-secret', {
      deps: {
        SecretManagerServiceClient: mockSecretManagerServiceClient,
        log: mockLog,
        error: mockError,
        exit: mockExit,
      },
    });

    expect(envConfig).toBeDefined();
    expect(envConfig!['KEY']).toBe('VALUE');
    expect(envConfig!['ANOTHER']).toBe('ONE');
    expect(process.env.KEY).toBe('VALUE');
    expect(process.env.ANOTHER).toBe('ONE');
  });

  test('should handle missing credentials', async () => {
    mockSecretManagerServiceClient = class extends SecretManagerServiceClient {
      accessSecretVersion = vi.fn().mockImplementation(async () => {
        const error: any = new Error('Could not load the default credentials');
        error.code = 16;
        throw error;
      });
    } as any;

    await loadGcpSecrets('test-project', 'test-secret', {
      deps: {
        SecretManagerServiceClient: mockSecretManagerServiceClient,
        log: mockLog,
        error: mockError,
        exit: mockExit,
      },
    });

    expect(errors.some((e) => e.includes('Google Cloud Credentials not found'))).toBe(true);
    expect(exitCode).toBe(1);
  });

  test('should throw other errors', async () => {
    mockSecretManagerServiceClient = class extends SecretManagerServiceClient {
      accessSecretVersion = vi.fn().mockImplementation(async () => {
        throw new Error('Permission Denied');
      });
    } as any;

    await expect(
      loadGcpSecrets('test-project', 'test-secret', {
        deps: {
          SecretManagerServiceClient: mockSecretManagerServiceClient,
          log: mockLog,
          error: mockError,
          exit: mockExit,
        },
      }),
    ).rejects.toThrow('Permission Denied');
  });
});
