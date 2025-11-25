import { test, expect } from "../fixtures";
import fs from "fs";
import path from "path";
import ts from "typescript";

const mockChromeTs = fs.readFileSync(
  path.join(process.cwd(), "test/mocks/mock-chrome.ts"),
  "utf-8"
);
const mockChromeScript = ts.transpileModule(mockChromeTs, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;

test.describe("Badge Functionality", () => {
  test.beforeEach(async ({ page }) => {
    // Inject Sinon and the mock Chrome API
    await page.addInitScript({ path: 'node_modules/sinon/pkg/sinon.js' });
    await page.addInitScript(mockChromeScript);

    // Navigate to a page to provide a context
    await page.goto("/dist/html/popup.html");
  });

  test("should show badge on redirection", async ({ page }) => {
    // Stub chrome.action.setBadgeText
    await page.evaluate(() => {
      window.sinon.stub(window.chrome.action, "setBadgeText");
    });

    // Load the background script logic
    await page.addScriptTag({ url: "/dist/background.js", type: "module" });
    await page.waitForTimeout(500);

    // Set up a redirection rule
    await page.evaluate(() => {
      const rules = [{ source: "reddit.com", target: "google.com", active: true, count: 0 }];
      window.chrome.storage.local.set({ rules });
    });

    // Trigger the navigation event
    await page.evaluate(() => {
      (window.chrome.webNavigation.onBeforeNavigate as any).dispatch({
        frameId: 0,
        tabId: 1,
        url: "https://reddit.com/r/something",
      });
    });

    // Verify the stub was called with the correct text
    await expect.poll(async () => {
      return await page.evaluate(() => {
        return (window.chrome.action.setBadgeText as any).calledWith({ text: "1" });
      });
    }).toBe(true);
  });

  test("should not show badge if rule is inactive", async ({ page }) => {
    // Stub chrome.action.setBadgeText
    await page.evaluate(() => {
      window.sinon.stub(window.chrome.action, "setBadgeText");
    });

    await page.addScriptTag({ url: "/dist/background.js", type: "module" });
    await page.waitForTimeout(500);

    // Set up an inactive rule
    await page.evaluate(() => {
      const rules = [{ source: "reddit.com", target: "google.com", active: false, count: 0 }];
      window.chrome.storage.local.set({ rules });
    });

    // Trigger the navigation event
    await page.evaluate(() => {
      (window.chrome.webNavigation.onBeforeNavigate as any).dispatch({
        frameId: 0,
        tabId: 1,
        url: "https://reddit.com/r/something",
      });
    });

    // Wait a bit to ensure it didn't happen
    await page.waitForTimeout(200);

    // Verify the stub was not called
    const wasCalled = await page.evaluate(() => {
      return (window.chrome.action.setBadgeText as any).called;
    });
    expect(wasCalled).toBe(false);
  });
});
