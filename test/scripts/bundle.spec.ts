import { test, expect, describe, beforeEach, afterEach } from '@playwright/test';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import util from 'util';

const execPromise = util.promisify(exec);
const rootDir = path.resolve(__dirname, '..', '..');
const bundleScriptPath = path.join(rootDir, 'scripts', 'bundle.ts');
const buildDir = path.join(rootDir, 'build');
const zipPath = path.join(buildDir, 'extension.zip');

describe('bundle.ts script (black-box)', () => {
    beforeEach(() => {
        // Ensure the build directory is clean before each test
        fs.emptyDirSync(buildDir);
    });

    afterEach(() => {
        fs.emptyDirSync(buildDir);
    });

    test('should create an extension.zip file', async () => {
        const command = `npx ts-node ${bundleScriptPath}`;

        const { stdout, stderr } = await execPromise(command);

        expect(stdout).toContain('Bundle complete!');
        expect(stderr).toBe('');

        // Verify that the zip file exists
        expect(fs.existsSync(zipPath)).toBe(true);
    });
});
