import { test, expect, describe, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { bundle } from '../../../scripts/bundle';
import { ExecSyncOptions } from 'child_process';
import fs from 'fs-extra';
import AdmZip from 'adm-zip';

describe('Bundle Script', () => {
  let mockExecSync: any;
  let mockFs: Partial<typeof fs>;
  let mockAdmZip: any;
  let mockLog: (...args: any[]) => void;
  let mockError: any;
  let logs: string[] = [];
  let errors: string[] = [];
  let executedCommands: string[] = [];
  let fsOperations: any[] = [];
  let zipOperations: any[] = [];

  beforeEach(() => {
    logs = [];
    errors = [];
    executedCommands = [];
    fsOperations = [];
    zipOperations = [];

    mockLog = (...args: any[]) => logs.push(args.join(' '));
    mockError = (...args: any[]) => errors.push(args.join(' '));

    mockExecSync = (cmd: string, options: ExecSyncOptions) => {
      executedCommands.push(cmd);
      return Buffer.from('');
    };

    mockFs = {
      ensureDirSync: (path: any) => fsOperations.push({ op: 'ensureDirSync', path }),
      existsSync: (path: any) => true,
      readdirSync: (path: any) => ['file1', 'file2'] as any,
      statSync: (path: any) => ({ size: 1024 }) as any,
      readJsonSync: (path: any) => ({ version: '1.0.0' }),
      copySync: (src: any, dest: any) => fsOperations.push({ op: 'copySync', src, dest }),
      removeSync: (path: any) => fsOperations.push({ op: 'removeSync', path }),
    };

    mockAdmZip = class {
      addLocalFolder(path: string) {
        zipOperations.push({ op: 'addLocalFolder', path });
      }
      writeZip(path: string) {
        zipOperations.push({ op: 'writeZip', path });
      }
    };
  });

  test('should run bundle process correctly', async () => {
    await bundle({
      deps: {
        execSync: mockExecSync,
        fs: mockFs as any,
        AdmZip: mockAdmZip,
        log: mockLog,
        error: mockError,
      },
    });

    // Check logs
    expect(logs.some((l) => l.includes('Starting bundle process'))).toBe(true);
    expect(logs.some((l) => l.includes('Bundle complete'))).toBe(true);

    // Check commands
    expect(executedCommands.some((cmd) => cmd.includes('npm run build'))).toBe(true);

    // Check FS operations
    expect(fsOperations.some((op) => op.op === 'ensureDirSync')).toBe(true);

    // Check Zip operations
    expect(zipOperations.some((op) => op.op === 'addLocalFolder')).toBe(true);
    expect(zipOperations.some((op) => op.op === 'writeZip')).toBe(true);
  });

  test('should handle empty dist directory', async () => {
    mockFs.readdirSync = () => [];

    // Mock process.exit
    const originalExit = process.exit;
    let exitCode: number | undefined;
    process.exit = ((code?: number) => {
      exitCode = code;
      throw new Error('Process Exited');
    }) as any;

    try {
      await bundle({
        deps: {
          execSync: mockExecSync,
          fs: mockFs as any,
          AdmZip: mockAdmZip,
          log: mockLog,
          error: mockError,
        },
      });
    } catch (e: any) {
      expect(e.message).toBe('Process Exited');
    } finally {
      process.exit = originalExit;
    }

    expect(errors.some((e) => e.includes('Build failed: dist directory is empty'))).toBe(true);
    expect(exitCode).toBe(1);
  });
});
