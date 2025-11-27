import { test, expect, getServiceWorker } from '../fixtures';

test.describe('Badge Functionality', () => {
  test('should not show badge if rule is inactive', async ({ context, page }) => {
    const worker = await getServiceWorker(context);
    await worker.evaluate(async () => {
      const rules = [{ source: "example.org", target: "google.com", active: false, count: 0 }];
      await chrome.storage.local.set({ rules });
    });

    // Navigate to the source URL
    await page.goto("https://example.org");

    // Verify badge text is empty
    await expect.poll(async () => {
      return await worker.evaluate(async () => {
        const tabs = await chrome.tabs.query({ active: true });
        if (tabs.length === 0) return null;
        return await chrome.action.getBadgeText({ tabId: tabs[0].id! });
      });
    }).toBe("");
  });
});
