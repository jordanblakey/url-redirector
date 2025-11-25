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
          reports: ["v8", "console-details"],
          entryFilter: (entry: any) =>
            entry.url.includes("dist/") && !entry.url.endsWith(".css"),
          sourceFilter: (sourcePath: string) =>
            sourcePath.search(/src\/.+/) !== -1,
        },
      },
    ],
    ["dot"], // compact
    // ['list'], // verbose
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
