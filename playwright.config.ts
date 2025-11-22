import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
    testDir: '.',
    testMatch: ['**/*.spec.ts'],
    testIgnore: ['**/node_modules/**'],
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: [
        ['list'],
        ['html', { outputFolder: 'test/playwright-report' }],
        ['monocart-reporter', {
            name: "URL Redirector E2E Coverage Report",
            outputFile: 'test/coverage/index.html',
            coverage: {
                lcov: true,
                reports: ['v8', 'console-details'],
                entryFilter: (entry: any) => entry.url.includes('dist/') && !entry.url.endsWith('.css'),
                sourceFilter: (sourcePath: string) => sourcePath.search(/src\/.+/) !== -1,
            }
        }]
    ],
    outputDir: 'test/test-results',
    use: {
        baseURL: 'http://localhost:8000',
        trace: 'retain-on-failure',
        video: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    webServer: {
        command: 'python3 -m http.server 8000 2>/dev/null',
        url: 'http://localhost:8000',
        reuseExistingServer: !process.env.CI,
        cwd: '.'
    },
});
