import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: ["**/*.spec.ts"],
  testIgnore: ["**/node_modules/**"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [
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
      slowMo: 100,
    },
  },
});
