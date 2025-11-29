import { test, expect, getServiceWorker } from '../fixtures';

test.describe('Badge Functionality', () => {
  test('should not show badge if rule is inactive', async ({ context, page }) => {
    const worker = await getServiceWorker(context);
    await worker.evaluate(async () => {
      const rules = [{ source: 'example.org', target: 'google.com', active: false, count: 0 }];
      await chrome.storage.local.set({ rules });
    });

    // Navigate to the source URL
    await page.goto('https://example.org');

    // Verify badge text is empty
    await expect
      .poll(async () => {
        return await worker.evaluate(async () => {
          const tabs = await chrome.tabs.query({ active: true });
          if (tabs.length === 0) return null;
          return await chrome.action.getBadgeText({ tabId: tabs[0].id! });
        });
      })
      .toBe('');
  });

  test('should show badge count after redirect', async ({ context, page }) => {
    const worker = await getServiceWorker(context);
    await worker.evaluate(async () => {
      const rules = [
        { source: 'badge-test.com', target: 'google.com', active: true, count: 0, id: 300 },
      ];
      await chrome.storage.local.set({ rules });
    });

    // Mock network to avoid external dependencies
    await page.route('https://badge-test.com/', async (route) => {
      await route.fulfill({ status: 200, body: 'Source Page' });
    });

    // Navigate to the source URL
    await page.goto('https://badge-test.com/');

    // Wait for redirect
    await expect(page).toHaveURL(/google\.com/);

    // Verify badge text shows "1"
    await expect
      .poll(async () => {
        return await worker.evaluate(async () => {
          const tabs = await chrome.tabs.query({ active: true });
          if (tabs.length === 0) return null;
          return await chrome.action.getBadgeText({ tabId: tabs[0].id! });
        });
      })
      .toBe('1');
  });

  test('should increment badge count on subsequent redirects', async ({ context, page }) => {
    const worker = await getServiceWorker(context);
    await worker.evaluate(async () => {
      const rules = [
        { source: 'badge-increment.com', target: 'google.com', active: true, count: 0, id: 301 },
      ];
      await chrome.storage.local.set({ rules });
    });

    // Mock network
    await page.route('https://badge-increment.com/', async (route) => {
      await route.fulfill({ status: 200, body: 'Source Page' });
    });

    // First visit
    await page.goto('https://badge-increment.com/');
    await expect(page).toHaveURL(/google\.com/);

    // Verify "1"
    await expect
      .poll(async () => {
        return await worker.evaluate(async () => {
          const tabs = await chrome.tabs.query({ active: true });
          return await chrome.action.getBadgeText({ tabId: tabs[0].id! });
        });
      })
      .toBe('1');

    // Second visit
    await page.goto('https://badge-increment.com/');
    await expect(page).toHaveURL(/google\.com/);

    // Verify "2"
    await expect
      .poll(async () => {
        return await worker.evaluate(async () => {
          const tabs = await chrome.tabs.query({ active: true });
          return await chrome.action.getBadgeText({ tabId: tabs[0].id! });
        });
      })
      .toBe('2');
  });
});
