import { test, expect } from '../fixtures';
import { getServiceWorker } from '../fixtures';

test.describe('Content Script', () => {
  test('should remove url_redirector param', async ({ page, httpServer }) => {
    const testSource = 'e2e_test_source';
    const initialUrl = `${httpServer}/?param1=value1&url_redirector=${testSource}&param2=value2`;
    const expectedUrl = `${httpServer}/?param1=value1&param2=value2`;

    await page.goto(initialUrl);

    // 1. Verify URL cleanup
    await expect(page).toHaveURL(expectedUrl);
  });

  test('should not modify URL if url_redirector param is not present', async ({
    page,
    httpServer,
  }) => {
    const initialUrl = `${httpServer}/?param1=value1&param2=value2`;

    await page.goto(initialUrl);

    // 1. Verify URL remains unchanged
    await expect(page).toHaveURL(initialUrl);
  });

  test('should unregister service worker if rule exists', async ({ page, httpServer, context }) => {
    // 1. Register a Service Worker
    await page.goto(httpServer);
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js');
        await new Promise<void>((resolve) => {
          if (registration.active) {
            resolve();
          } else {
            const worker = registration.installing || registration.waiting;
            if (worker) {
              worker.addEventListener('statechange', () => {
                if (worker.state === 'activated') resolve();
              });
            }
          }
        });
      }
    });

    // Verify SW is registered
    const registrations = await page.evaluate(async () => {
      return (await navigator.serviceWorker.getRegistrations()).length;
    });
    expect(registrations).toBe(1);

    // 2. Add a redirect rule for this page using the background worker
    const background = await getServiceWorker(context);
    const rule = {
      id: 1,
      source: httpServer,
      target: 'http://example.com',
      active: false,
      count: 0,
    };

    await background.evaluate((rule) => {
      chrome.storage.local.set({ rules: [rule] });
    }, rule);

    // 3. Reload the page to trigger the content script
    await page.reload();

    // 4. Verify SW is unregistered
    // The content script polls or listens for controller change, but we might need to wait a bit
    await expect
      .poll(async () => {
        return await page.evaluate(async () => {
          return (await navigator.serviceWorker.getRegistrations()).length;
        });
      })
      .toBe(0);
  });
});
