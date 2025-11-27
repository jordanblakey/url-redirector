import { test, expect, describe, beforeEach, afterEach } from '@playwright/test';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import util from 'util';

const execPromise = util.promisify(exec);
const rootDir = path.resolve(__dirname, '..', '..');
const buildScriptPath = path.join(rootDir, 'scripts', 'build.ts');

describe('build.ts script (black-box)', () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = path.join(os.tmpdir(), `build-test-${Date.now()}`);
        fs.mkdirSync(tempDir, { recursive: true });
    });

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    test('should create a dist directory with expected files', async () => {
        const command = `npx ts-node ${buildScriptPath} ${tempDir}`;

        const { stdout, stderr } = await execPromise(command);

        expect(stdout).toContain('Build complete!');
        expect(stderr).toBe('');

        // Verify that the output directory exists and is not empty
        expect(fs.existsSync(tempDir)).toBe(true);
        const files = fs.readdirSync(tempDir);
        expect(files.length).toBeGreaterThan(0);

        // Verify that key files and directories are present
        expect(files).toContain('manifest.json');
        expect(files).toContain('html');
        expect(files).toContain('styles');
        expect(files).toContain('icons');
    });

    test('should correctly adjust paths in manifest.json', async () => {
        const command = `npx ts-node ${buildScriptPath} ${tempDir}`;
        await execPromise(command);

        const manifestPath = path.join(tempDir, 'manifest.json');
        const manifest = fs.readJsonSync(manifestPath);

        // Check icon path adjustment
        expect(manifest.action.default_icon['128']).toBe('icons/icon-128.png');
        expect(manifest.options_page).toBe('html/options.html');

        // Check background service worker path adjustment
        expect(manifest.background.service_worker).toBe('background.js');
    });

    test('should exit with error if compilation fails', async () => {
        // Force an error by creating a fake, invalid tsconfig
        const fakeTsConfigPath = path.join(tempDir, 'tsconfig.json');
        fs.writeFileSync(fakeTsConfigPath, '{ "compilerOptions": { "strict": true } }'); // An incomplete config

        const command = `npx ts-node --project ${fakeTsConfigPath} ${buildScriptPath} ${tempDir}`;

        await expect(execPromise(command)).rejects.toThrow();
    });
});
