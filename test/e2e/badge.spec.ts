import { test, expect, getServiceWorker } from '../fixtures';

test.describe('Badge Functionality', () => {
  test('should not show badge if rule is inactive', async ({ context, page }) => {
    const worker = await getServiceWorker(context);
    await worker.evaluate(async () => {
      const rules = [{ source: 'example.org', target: 'google.com', active: false, count: 0 }];
      await (self as any).storage.saveRules(rules);
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
      await (self as any).storage.saveRules(rules);
      await new Promise<void>((resolve) => {
        const check = () => {
          chrome.declarativeNetRequest.getDynamicRules().then((rules) => {
            if (rules.length > 0) resolve();
            else setTimeout(check, 50);
          });
        };
        check();
      });
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
      await (self as any).storage.saveRules(rules);
      await new Promise<void>((resolve) => {
        const check = () => {
          chrome.declarativeNetRequest.getDynamicRules().then((rules) => {
            if (rules.length > 0) resolve();
            else setTimeout(check, 50);
          });
        };
        check();
      });
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
  test('should increment badge count up to 20', async ({ context, page }) => {
    test.setTimeout(60000); // Increase timeout for setup and loop
    const worker = await getServiceWorker(context);
    await worker.evaluate(async () => {
      const rules = [{ source: 'a.com', target: 'b.com', active: true, count: 0, id: 302 }];
      await (self as any).storage.saveRules(rules);
      await new Promise<void>((resolve) => {
        const check = () => {
          chrome.declarativeNetRequest.getDynamicRules().then((rules) => {
            if (rules.length > 0) resolve();
            else setTimeout(check, 100);
          });
        };
        check();
      });
    });

    // Mock network for both source and target
    await page.route('**/*', (route) => {
      const url = route.request().url();
      try {
        const hostname = new URL(url).hostname;
        if (hostname === 'a.com') {
          return route.fulfill({ status: 200, body: 'Source Page' });
        }
        if (hostname === 'b.com') {
          return route.fulfill({ status: 200, body: 'Target Page' });
        }
      } catch (e) {
        // Ignore invalid URLs
      }
      return route.continue();
    });

    for (let i = 1; i <= 20; i++) {
      await page.goto('https://a.com/');
      await expect(page).toHaveURL(/b\.com/);

      // Verify badge count matches iteration
      await expect
        .poll(async () => {
          return await worker.evaluate(async () => {
            const tabs = await chrome.tabs.query({ active: true });
            if (tabs.length === 0) return null;
            return await chrome.action.getBadgeText({ tabId: tabs[0].id! });
          });
        })
        .toBe(i.toString());
    }
  });

  test('should increment badge count for transitive redirects up to 20', async ({
    context,
    page,
  }) => {
    test.setTimeout(60000);
    const worker = await getServiceWorker(context);
    await worker.evaluate(async () => {
      const rules = [
        { source: 'a.com', target: 'b.com', active: true, count: 0, id: 401 },
        { source: 'b.com', target: 'c.com', active: true, count: 0, id: 402 },
        { source: 'c.com', target: 'd.com', active: true, count: 0, id: 403 },
      ];
      await (self as any).storage.saveRules(rules);
      await new Promise<void>((resolve) => {
        const check = () => {
          chrome.declarativeNetRequest.getDynamicRules().then((rules) => {
            if (rules.length > 0) resolve();
            else setTimeout(check, 100);
          });
        };
        check();
      });
    });

    // Mock network
    await page.route('**/*', (route) => {
      const url = route.request().url();
      try {
        const hostname = new URL(url).hostname;
        if (['a.com', 'b.com', 'c.com', 'd.com'].includes(hostname)) {
          return route.fulfill({ status: 200, body: 'Page' });
        }
      } catch (e) {
        // Ignore invalid URLs
      }
      return route.continue();
    });

    for (let i = 1; i <= 20; i++) {
      await page.goto('https://a.com/');
      await expect(page).toHaveURL(/d\.com/);

      // Verify badge count matches iteration
      await expect
        .poll(async () => {
          return await worker.evaluate(async () => {
            const tabs = await chrome.tabs.query({ active: true });
            if (tabs.length === 0) return null;
            return await chrome.action.getBadgeText({ tabId: tabs[0].id! });
          });
        })
        .toBe(i.toString());
    }

    // Verify all rule counts are 20
    await expect
      .poll(async () => {
        return await worker.evaluate(async () => {
          const rules = await (self as any).storage.getRules();
          const r1 = rules.find((r: any) => r.id === 401);
          const r2 = rules.find((r: any) => r.id === 402);
          const r3 = rules.find((r: any) => r.id === 403);
          return {
            c1: r1?.count,
            c2: r2?.count,
            c3: r3?.count,
          };
        });
      })
      .toEqual({
        c1: 20,
        c2: 20,
        c3: 20,
      });
  });
});
