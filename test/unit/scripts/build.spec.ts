import { test, expect, describe, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { build } from '../../../scripts/build';
import path from 'path';

import { ExecSyncOptions } from 'child_process';
import fs from 'fs-extra';

describe('Build Script', () => {
    let mockExecSync: (cmd: string, options: ExecSyncOptions) => Buffer;
    let mockFs: typeof fs;
    let mockLog: (...args: any[]) => void;
    let mockWarn: (...args: any[]) => void;
    let mockError: (...args: any[]) => void;
    let logs: string[] = [];
    let warns: string[] = [];
    let errors: string[] = [];
    let executedCommands: string[] = [];
    let fsOperations: any[] = [];

    beforeEach(() => {
        logs = [];
        warns = [];
        errors = [];
        executedCommands = [];
        fsOperations = [];

        mockLog = (...args: any[]) => logs.push(args.join(' '));
        mockWarn = (...args: any[]) => warns.push(args.join(' '));
        mockError = (...args: any[]) => errors.push(args.join(' '));

        mockExecSync = (cmd: string, options: ExecSyncOptions) => {
            executedCommands.push(cmd);
            return Buffer.from('');
        };

        mockFs = {
            ...fs,
            emptyDirSync: (path: string) => fsOperations.push({ op: 'emptyDirSync', path }),
            existsSync: (path: string) => true,
            readFileSync: (path: string, options: any) => {
                if (path.endsWith('manifest.json')) {
                    return JSON.stringify({
                        version: '1.0.0',
                        background: { service_worker: 'dist/background.js' },
                        icons: { "16": "assets/icon16.png" }
                    });
                }
                return '';
            },
            writeFileSync: (path: string, content: string) => {
                fsOperations.push({ op: 'writeFileSync', path, content });
            },
            copy: async (src: string, dest: string) => {
                fsOperations.push({ op: 'copy', src, dest });
            }
        };
    });

    test('should run build process correctly', async () => {
        await build({
            deps: {
                execSync: mockExecSync,
                fs: mockFs,
                log: mockLog,
                warn: mockWarn,
                error: mockError
            }
        });

        // Check logs
        expect(logs.some(l => l.includes('Starting build process'))).toBe(true);
        expect(logs.some(l => l.includes('Build complete'))).toBe(true);

        // Check commands
        expect(executedCommands.some(cmd => cmd.includes('tsc'))).toBe(true);

        // Check FS operations
        expect(fsOperations.some(op => op.op === 'emptyDirSync')).toBe(true);
        expect(fsOperations.some(op => op.op === 'writeFileSync' && op.path.endsWith('manifest.json'))).toBe(true);
        expect(fsOperations.some(op => op.op === 'copy')).toBe(true);

        // Verify manifest adjustment
        const writeOp = fsOperations.find(op => op.op === 'writeFileSync' && op.path.endsWith('manifest.json'));
        const writtenManifest = JSON.parse(writeOp.content);
        expect(writtenManifest.background.service_worker).toBe('background.js');
        expect(writtenManifest.icons["16"]).toBe('icon16.png');
    });

    test('should handle build failure', async () => {
        mockExecSync = () => { throw new Error('TSC Failed'); };

        // Mock process.exit to prevent test from exiting
        const originalExit = process.exit;
        let exitCode: number | undefined;
        process.exit = ((code?: number) => {
            exitCode = code;
            throw new Error('Process Exited');
        }) as (code?: number) => never;

        try {
            await build({
                deps: {
                    execSync: mockExecSync,
                    fs: mockFs,
                    log: mockLog,
                    warn: mockWarn,
                    error: mockError
                }
            });
        } catch (e: any) {
            expect(e.message).toBe('Process Exited');
        } finally {
            process.exit = originalExit;
        }

        expect(errors.some(e => e.includes('Build failed'))).toBe(true);
        expect(exitCode).toBe(1);
    });
});
