import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:8000',
        trace: 'on-first-retry',
    },
    webServer: {
        command: 'python3 -m http.server 8000',
        url: 'http://localhost:8000',
        reuseExistingServer: !process.env.CI,
    },
});
