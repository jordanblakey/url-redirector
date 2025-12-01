import { test, expect, getServiceWorker } from '../fixtures';

test.describe('SPA Navigation Redirects', () => {
  test('should redirect when navigating via history.pushState', async ({ context }) => {
    const worker = await getServiceWorker(context);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 1. Add a rule: example.com/spa-target -> google.com
    await worker.evaluate(async () => {
      const rules = [
        {
          id: 1,
          source: 'example.com/spa-target',
          target: 'google.com',
          active: true,
          count: 0,
        },
      ];
      await (self as any).storage.saveRules(rules);
    });

    // 2. Open a tab to a non-matching URL on the same domain
    const page = await context.newPage();

    // Mock the page to allow pushState
    await page.route('https://example.com/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <html>
            <body>
              <h1>SPA Page</h1>
              <button id="nav-btn" onclick="history.pushState({}, '', '/spa-target')">Go to Target</button>
            </body>
          </html>
        `,
      });
    });

    await page.goto('https://example.com/initial');

    // Verify we are on the initial page
    expect(page.url()).toBe('https://example.com/initial');

    // 3. Trigger SPA navigation
    // We can click a button that does pushState, or execute it directly.
    // Let's click the button to be more realistic.
    await page.click('#nav-btn');

    // 4. Verify redirect happens
    // The extension should detect the navigation and redirect to google.com
    await expect(page).toHaveURL(/google\.com/);

    // 5. Verify count increment
    // We need to check the storage to see if the count increased
    await worker.evaluate(async () => {
      const rules = await (self as any).storage.getRules();
      const rule = rules.find((r: any) => r.id === 1);
      if (!rule || rule.count !== 1) {
        throw new Error(`Expected count to be 1, but got ${rule ? rule.count : 'undefined'}`);
      }
    });
  });

  test('should NOT redirect when rule is paused (active but pausedUntil future)', async ({
    context,
  }) => {
    const worker = await getServiceWorker(context);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 1. Add a paused rule
    await worker.evaluate(async () => {
      const rules = [
        {
          id: 2,
          source: 'example.com/spa-paused',
          target: 'google.com',
          active: true,
          count: 0,
          pausedUntil: Date.now() + 100000, // Paused for 100s
        },
      ];
      await (self as any).storage.saveRules(rules);
    });

    // 2. Open a tab
    const page = await context.newPage();

    // Mock the page
    await page.route('https://example.com/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <html>
            <body>
              <h1>SPA Page</h1>
              <button id="nav-btn" onclick="history.pushState({}, '', '/spa-paused')">Go to Paused Target</button>
            </body>
          </html>
        `,
      });
    });

    await page.goto('https://example.com/initial');

    // 3. Trigger SPA navigation
    await page.click('#nav-btn');

    // 4. Verify NO redirect happens (should stay on spa-paused)
    // Wait a bit to ensure no redirect happens
    await page.waitForTimeout(1000);
    expect(page.url()).toBe('https://example.com/spa-paused');
  });

  test('should NOT double count when multiple SPA navigations occur rapidly', async ({
    context,
  }) => {
    const worker = await getServiceWorker(context);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 1. Add a rule
    await worker.evaluate(async () => {
      const rules = [
        {
          id: 3,
          source: 'example.com/spa-double',
          target: 'google.com',
          active: true,
          count: 0,
        },
      ];
      await (self as any).storage.saveRules(rules);
    });

    // 2. Open a tab
    const page = await context.newPage();

    // Mock the page
    await page.route('https://example.com/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <html>
            <body>
              <h1>SPA Page</h1>
              <button id="nav-btn" onclick="
                history.pushState({}, '', '/spa-double');
                history.pushState({}, '', '/spa-double');
                history.pushState({}, '', '/spa-double');
              ">Go to Double Target</button>
            </body>
          </html>
        `,
      });
    });

    await page.goto('https://example.com/initial');

    // 3. Trigger multiple SPA navigations rapidly
    await page.click('#nav-btn');

    // 4. Verify redirect happens
    await expect(page).toHaveURL(/google\.com/);

    // 5. Verify count is EXACTLY 1
    await worker.evaluate(async () => {
      const rules = await (self as any).storage.getRules();
      const rule = rules.find((r: any) => r.id === 3);
      if (!rule || rule.count !== 1) {
        throw new Error(`Expected count to be 1, but got ${rule ? rule.count : 'undefined'}`);
      }
    });
  });
});
