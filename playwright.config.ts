import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
    testDir: '.',
    testMatch: ['**/*.spec.ts'],
    testIgnore: ['**/node_modules/**'],
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [['html', { outputFolder: 'test/playwright-report' }]],
    outputDir: 'test/test-results',
    use: {
        baseURL: 'http://localhost:8000',
        trace: 'on-first-retry'
    },
    webServer: {
        command: 'python3 -m http.server 8000',
        url: 'http://localhost:8000',
        reuseExistingServer: !process.env.CI,
        cwd: '.',
    },
});
