import { defineConfig, type ReporterDescription } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['**/e2e/*.spec.ts'],
  testIgnore: ['**/node_modules/**'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: createReporter(),
  outputDir: 'test/artifacts/test-results',
  use: {
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      // slowMo: 100, // Optionally slow down the test execution in the browser. Use with workers: 1 to watch the test execution.
    },
  },
  // workers: 1, // Use 1 worker to run tests serially and watch the test execution.
});

function createReporter() {
  const reporters: ReporterDescription[] = [];
  reporters.push(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ['html', { open: 'never', outputFolder: 'test/artifacts/playwright-report' }] as [string, any],
  );
  if (process.env.CI) {
    reporters.push(['github']);
  } else {
    if (process.env.COVERAGE) {
      reporters.push(['list']);
      reporters.push([
        'monocart-reporter',
        {
          name: 'URL Redirector E2E Coverage Report',
          outputFile: 'test/artifacts/monocart-report.html',
          open: true,
          logging: 'warn',
          clear: false,
          coverage: {
            lcov: true,
            reports: [['v8'], ['html'], ['console-details']],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            entryFilter: (entry: any) => {
              if (entry.url.startsWith('http://') || entry.url.startsWith('https://')) {
                return false;
              }
              if (entry.url.includes('node_modules')) return false;
              const isProjectFile =
                entry.url.includes('/dist/') ||
                entry.url.includes('/src/') ||
                entry.url.includes('scripts');
              return isProjectFile && !entry.url.endsWith('.css');
            },
            sourceFilter: (sourcePath: string) =>
              sourcePath.search(/src\//) !== -1 || sourcePath.search(/scripts\//) !== -1,
          },
        },
      ]);
    } else {
      reporters.push(['dot']);
    }
  }
  return reporters;
}
