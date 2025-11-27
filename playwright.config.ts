import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: ["**/*.spec.ts"],
  testIgnore: ["**/node_modules/**"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [ // https://playwright.dev/docs/test-reporters
    [
      "monocart-reporter",
      {
        name: "URL Redirector E2E Coverage Report",
        outputFile: "test/coverage/index.html",
        open: true,
        logging: "warn", // "debug", "info", "warn", "error"
        coverage: {
          lcov: true,
          reports: [
            ['v8'],              // generates JSON format files
            ['html'],             // generates HTML report files
            ['console-details'], // shows CLI table with summary
          ],
          entryFilter: (entry: any) => {
            // Only accept files that are part of YOUR project
            if (entry.url.includes('node_modules')) return false;
            // Only include files that are likely your source code
            const isProjectFile = entry.url.includes('/dist/') || entry.url.includes('/src/');
            // Exclude CSS files
            return isProjectFile && !entry.url.endsWith('.css');
          },
          // Keep source filter to ensure we map back to TS files if possible
          sourceFilter: (sourcePath: string) => sourcePath.search(/src\//) !== -1,
        },
      },
    ],
    ["list"], // compact
    ["html", { outputFolder: "test/playwright-report", open: true }], // artifacts
  ],
  outputDir: "test/test-results",
  use: {
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      // slowMo: 100, // Optionally slow down the test execution in the browser. Use with workers: 1 to watch the test execution.
    },
  },
  // workers: 1, // Use 1 worker to run tests serially and watch the test execution.
});