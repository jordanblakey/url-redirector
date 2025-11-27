import { test, expect } from '../fixtures';
import { bundle } from '../../scripts/bundle';

test.describe('Bundle Script', () => {
    let mockExecSync: any;
    let mockFs: any;
    let mockAdmZip: any;
    let mockLog: any;
    let mockError: any;
    let logs: string[] = [];
    let errors: string[] = [];
    let executedCommands: string[] = [];
    let fsOperations: any[] = [];
    let zipOperations: any[] = [];

    test.beforeEach(() => {
        logs = [];
        errors = [];
        executedCommands = [];
        fsOperations = [];
        zipOperations = [];

        mockLog = (...args: any[]) => logs.push(args.join(' '));
        mockError = (...args: any[]) => errors.push(args.join(' '));

        mockExecSync = (cmd: string, options: any) => {
            executedCommands.push(cmd);
            return Buffer.from('');
        };

        mockFs = {
            ensureDirSync: (path: string) => fsOperations.push({ op: 'ensureDirSync', path }),
            existsSync: (path: string) => true,
            readdirSync: (path: string) => ['file1', 'file2'],
            statSync: (path: string) => ({ size: 1024 }),
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
                fs: mockFs,
                AdmZip: mockAdmZip,
                log: mockLog,
                error: mockError
            }
        });

        // Check logs
        expect(logs.some(l => l.includes('Starting bundle process'))).toBe(true);
        expect(logs.some(l => l.includes('Bundle complete'))).toBe(true);

        // Check commands
        expect(executedCommands.some(cmd => cmd.includes('npm run build'))).toBe(true);

        // Check FS operations
        expect(fsOperations.some(op => op.op === 'ensureDirSync')).toBe(true);

        // Check Zip operations
        expect(zipOperations.some(op => op.op === 'addLocalFolder')).toBe(true);
        expect(zipOperations.some(op => op.op === 'writeZip')).toBe(true);
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
                    fs: mockFs,
                    AdmZip: mockAdmZip,
                    log: mockLog,
                    error: mockError
                }
            });
        } catch (e: any) {
            expect(e.message).toBe('Process Exited');
        } finally {
            process.exit = originalExit;
        }

        expect(errors.some(e => e.includes('Build failed: dist directory is empty'))).toBe(true);
        expect(exitCode).toBe(1);
    });
});
