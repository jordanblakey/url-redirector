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
    // Inject the mock Chrome API
    await page.addInitScript(mockChromeScript);

    // Navigate to a page to provide a context
    await page.goto("/dist/html/popup.html");
  });

  test("should show badge on redirection", async ({ page }) => {
    // Spy on chrome.action.setBadgeText
    await page.evaluate(() => {
      const calls = [];
      const original = window.chrome.action.setBadgeText;
      window.chrome.action.setBadgeText = (details) => {
        calls.push(details);
        original(details);
      };
      (window as any).getBadgeTextCalls = () => calls;
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

    // Verify the spy was called with the correct text
    await expect.poll(async () => {
      const calls = await page.evaluate(() => (window as any).getBadgeTextCalls());
      return calls.length > 0 && calls[0].text === "1";
    }).toBe(true);
  });

  test("should not show badge if rule is inactive", async ({ page }) => {
    // Spy on chrome.action.setBadgeText
    await page.evaluate(() => {
      const calls = [];
      const original = window.chrome.action.setBadgeText;
      window.chrome.action.setBadgeText = (details) => {
        calls.push(details);
        original(details);
      };
      (window as any).getBadgeTextCalls = () => calls;
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

    // Verify the spy was not called
    const calls = await page.evaluate(() => (window as any).getBadgeTextCalls());
    expect(calls.length).toBe(0);
  });
});
