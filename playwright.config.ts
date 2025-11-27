import { defineConfig } from "@playwright/test";

// https://playwright.dev/docs/test-reporters

export default defineConfig({
  testDir: ".",
  testMatch: ["**/*.spec.ts"],
  testIgnore: ["**/node_modules/**"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    !!process.env.CI ? ["github"] : ["dot"],
    ["html", { outputFolder: "test/playwright-report", open: true }], // artifacts
  ],
  outputDir: "test/test-results",
  use: {
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      slowMo: 100,
    },
  },
});
