import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: ["**/*.spec.ts"],
  testIgnore: ["**/node_modules/**"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [
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
            ['v8'],              // JSON format
            ['console-details'], // CLI table - with summary
            ['html']             // HTML report
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
    ["dot"], // compact
    ["html", { outputFolder: "test/playwright-report", open: true }], // artifacts
  ],
  outputDir: "test/test-results",
  use: {
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      // slowMo: 1000,
    },
  },
});