import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const rootDir = path.resolve(__dirname, '../..');
// Create a unique temporary directory for this test run
const distDir = path.join(rootDir, `dist-test-${Date.now()}`);

test.describe.configure({ mode: 'serial' });

test.describe('Build Process Validation', () => {
    test.beforeAll(() => {
        // Run the build command with the custom output directory
        console.log('Building extension...', distDir);
        execSync(`npm run build -- "${distDir}"`, {
            cwd: rootDir,
            stdio: 'pipe' // Suppress output for this test
        });
    });

    test.afterAll(() => {
        console.log('Cleaning up temporary directory...', distDir);
        // Clean up the temporary directory
        if (fs.existsSync(distDir)) {
            fs.rmSync(distDir, { recursive: true, force: true });
        }
    });

    test('dist directory should exist', () => {
        expect(fs.existsSync(distDir)).toBe(true);
    });

    test.describe('Required Files', () => {
        test('manifest.json should exist in dist', () => {
            const manifestPath = path.join(distDir, 'manifest.json');
            expect(fs.existsSync(manifestPath)).toBe(true);
        });

        test('manifest.json should be valid JSON', () => {
            const manifestPath = path.join(distDir, 'manifest.json');
            const content = fs.readFileSync(manifestPath, 'utf8');

            expect(() => JSON.parse(content)).not.toThrow();
        });

        test('manifest.json should have required fields', () => {
            const manifestPath = path.join(distDir, 'manifest.json');
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

            expect(manifest.manifest_version).toBe(3);
            expect(manifest.name).toBeTruthy();
            expect(manifest.version).toBeTruthy();
            expect(manifest.description).toBeTruthy();
            expect(manifest.permissions).toBeInstanceOf(Array);
            expect(manifest.background).toBeTruthy();
            expect(manifest.background.service_worker).toBeTruthy();
        });

        test('options.html should exist in dist', () => {
            const optionsHtmlPath = path.join(distDir, 'options.html');
            expect(fs.existsSync(optionsHtmlPath)).toBe(true);
        });

        test('options.css should exist in dist', () => {
            const optionsCssPath = path.join(distDir, 'options.css');
            expect(fs.existsSync(optionsCssPath)).toBe(true);
        });

        test('icons directory should exist in dist', () => {
            const iconsDir = path.join(distDir, 'icons');
            expect(fs.existsSync(iconsDir)).toBe(true);
            expect(fs.statSync(iconsDir).isDirectory()).toBe(true);
        });
    });

    test.describe('Compiled JavaScript Files', () => {
        test('background.js should exist in dist', () => {
            const backgroundPath = path.join(distDir, 'background.js');
            expect(fs.existsSync(backgroundPath)).toBe(true);
        });

        test('background.js should be valid JavaScript', () => {
            const backgroundPath = path.join(distDir, 'background.js');
            const content = fs.readFileSync(backgroundPath, 'utf8');

            // Check it's not empty and contains expected content
            expect(content.length).toBeGreaterThan(0);
            expect(content).toContain('chrome');
        });

        test('options.js should exist in dist', () => {
            const optionsPath = path.join(distDir, 'options.js');
            expect(fs.existsSync(optionsPath)).toBe(true);
        });

        test('utils.js should exist in dist', () => {
            const utilsPath = path.join(distDir, 'utils.js');
            expect(fs.existsSync(utilsPath)).toBe(true);
        });

        test('types.js should exist in dist', () => {
            const typesPath = path.join(distDir, 'types.js');
            expect(fs.existsSync(typesPath)).toBe(true);
        });
    });

    test.describe('Icon Files', () => {
        test('icon-128.png should exist', () => {
            const iconPath = path.join(distDir, 'icons', 'icon-128.png');
            expect(fs.existsSync(iconPath)).toBe(true);
        });

        test('icon-128.png should be a valid file with content', () => {
            const iconPath = path.join(distDir, 'icons', 'icon-128.png');
            const stats = fs.statSync(iconPath);

            expect(stats.size).toBeGreaterThan(0);
            expect(stats.isFile()).toBe(true);
        });

        test('icon-256.png should exist', () => {
            const iconPath = path.join(distDir, 'icons', 'icon-256.png');
            expect(fs.existsSync(iconPath)).toBe(true);
        });

        test('icon-256.png should be a valid file with content', () => {
            const iconPath = path.join(distDir, 'icons', 'icon-256.png');
            const stats = fs.statSync(iconPath);

            expect(stats.size).toBeGreaterThan(0);
            expect(stats.isFile()).toBe(true);
        });

        test('manifest icons should reference existing files', () => {
            const manifestPath = path.join(distDir, 'manifest.json');
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

            // Check icons in manifest
            if (manifest.icons) {
                Object.values(manifest.icons).forEach((iconPath: any) => {
                    const fullPath = path.join(distDir, iconPath);
                    expect(fs.existsSync(fullPath)).toBe(true);
                });
            }

            // Check action icons
            if (manifest.action && manifest.action.default_icon) {
                Object.values(manifest.action.default_icon).forEach((iconPath: any) => {
                    const fullPath = path.join(distDir, iconPath);
                    expect(fs.existsSync(fullPath)).toBe(true);
                });
            }
        });
    });

    test.describe('File Integrity', () => {
        test('all JavaScript files should have non-zero size', () => {
            const jsFiles = ['background.js', 'options.js', 'utils.js', 'types.js'];

            jsFiles.forEach(file => {
                const filePath = path.join(distDir, file);
                const stats = fs.statSync(filePath);
                expect(stats.size).toBeGreaterThan(0);
            });
        });

        test('options.html should reference options.css', () => {
            const htmlPath = path.join(distDir, 'options.html');
            const content = fs.readFileSync(htmlPath, 'utf8');

            expect(content).toContain('options.css');
        });

        test('options.html should reference options.js', () => {
            const htmlPath = path.join(distDir, 'options.html');
            const content = fs.readFileSync(htmlPath, 'utf8');

            expect(content).toContain('options.js');
        });

        test('manifest background service_worker should reference existing file', () => {
            const manifestPath = path.join(distDir, 'manifest.json');
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

            const serviceWorkerPath = manifest.background.service_worker;
            const fullPath = path.join(distDir, serviceWorkerPath);

            expect(fs.existsSync(fullPath)).toBe(true);
        });
    });

    test.describe('Extension Completeness', () => {
        test('dist should contain all files needed for a working extension', () => {
            const requiredFiles = [
                'manifest.json',
                'options.html',
                'options.css',
                'background.js',
                'options.js',
                'utils.js',
                'types.js',
                'icons/icon-128.png',
                'icons/icon-256.png'
            ];

            requiredFiles.forEach(file => {
                const filePath = path.join(distDir, file);
                expect(fs.existsSync(filePath)).toBe(true);
            });
        });

        test('no TypeScript source files should be in dist', () => {
            const files = fs.readdirSync(distDir);
            const tsFiles = files.filter(file => file.endsWith('.ts'));

            expect(tsFiles.length).toBe(0);
        });

        test('dist should be loadable as Chrome extension', () => {
            // Verify the basic structure Chrome expects
            const manifestPath = path.join(distDir, 'manifest.json');
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

            // Chrome extension requirements
            expect(manifest.manifest_version).toBe(3);
            expect(manifest.name).toBeTruthy();
            expect(manifest.version).toBeTruthy();

            // Service worker must exist
            const serviceWorkerPath = path.join(distDir, manifest.background.service_worker);
            expect(fs.existsSync(serviceWorkerPath)).toBe(true);

            // Options page must exist
            const optionsPagePath = path.join(distDir, manifest.options_page);
            expect(fs.existsSync(optionsPagePath)).toBe(true);
        });
    });

    test.describe('Build Reproducibility', () => {
        test('running build twice should produce same files', () => {
            // Get current file list
            const getFileList = (dir: string): string[] => {
                const files: string[] = [];
                const items = fs.readdirSync(dir);

                items.forEach(item => {
                    const fullPath = path.join(dir, item);
                    const stat = fs.statSync(fullPath);

                    if (stat.isDirectory()) {
                        files.push(...getFileList(fullPath).map(f => path.join(item, f)));
                    } else {
                        files.push(item);
                    }
                });

                return files.sort();
            };

            const filesBefore = getFileList(distDir);

            // Run build again
            execSync(`npm run build -- "${distDir}"`, {
                cwd: rootDir,
                stdio: 'pipe' // Suppress output for this test
            });

            const filesAfter = getFileList(distDir);

            expect(filesAfter).toEqual(filesBefore);
        });
    });
});
