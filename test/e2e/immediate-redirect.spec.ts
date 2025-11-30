import { test, expect, getServiceWorker } from '../fixtures';

test.describe('Immediate Redirect on Rule Change', () => {
  test('should immediately redirect tabs when a matching rule is added', async ({ context }) => {
    const worker = await getServiceWorker(context);

    // Open a tab to the source URL
    const page = await context.newPage();

    // Mock the source page to avoid network issues
    await page.route('https://example.com/', async (route) => {
      await route.fulfill({ status: 200, body: 'Source Page' });
    });

    await page.goto('https://example.com/');

    // Go to popup and add a rule to trigger redirect
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${worker.url().split('/')[2]}/html/popup.html`);
    await popup.fill('#sourceUrl', 'example.com');
    await popup.fill('#targetUrl', 'google.com');
    await popup.click('#addRuleBtn');
    await popup.waitForTimeout(100); // Allow time for message to be processed

    // Verify redirect
    await expect(page).toHaveURL(/google\.com/);
  });

  test('should immediately redirect tabs when a rule is unpaused (pausedUntil removed)', async ({
    context,
  }) => {
    const worker = await getServiceWorker(context);
    const now = Date.now();

    // Start with a paused rule
    await worker.evaluate(async (timestamp) => {
      const rules = [
        {
          source: 'example.org',
          target: 'google.com',
          active: true,
          count: 0,
          id: 124,
          pausedUntil: timestamp + 100000, // Paused
        },
      ];
      await (self as any).storage.saveRules(rules);
    }, now);

    // Open a tab to the source URL
    const page = await context.newPage();

    // Mock the source page
    await page.route('https://example.org/', async (route) => {
      await route.fulfill({ status: 200, body: 'Source Page' });
    });

    await page.goto('https://example.org/');

    // Ensure it stays on source (not redirected)
    await expect(page).toHaveURL(/example\.org/);

    // Go to popup and unpause the rule
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${worker.url().split('/')[2]}/html/popup.html`);
    const ruleItem = popup.locator('.rule-item').first();
    await ruleItem.hover();
    await ruleItem.locator('.toggle-btn').click();
    await popup.waitForTimeout(100);

    // Verify redirect
    await expect(page).toHaveURL(/google\.com/);
  });

  test('should immediately redirect tabs when a matching rule is resumed', async ({ context }) => {
    const worker = await getServiceWorker(context);

    // Start with an inactive rule
    await worker.evaluate(async () => {
      const rules = [
        {
          source: 'example.net',
          target: 'google.com',
          active: false,
          count: 0,
          id: 125,
        },
      ];
      await (self as any).storage.saveRules(rules);
    });

    // Open a tab to the source URL
    const page = await context.newPage();

    // Mock the source page
    await page.route('https://example.net/', async (route) => {
      await route.fulfill({ status: 200, body: 'Source Page' });
    });

    await page.goto('https://example.net/');

    // Ensure it stays on source
    await expect(page).toHaveURL(/example\.net/);

    // Go to popup and resume the rule
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${worker.url().split('/')[2]}/html/popup.html`);
    const ruleItem = popup.locator('.rule-item').first();
    await ruleItem.hover();
    await ruleItem.locator('.toggle-btn').click();
    await popup.waitForTimeout(100);

    // Verify redirect
    await expect(page).toHaveURL(/google\.com/);
  });

  test('should redirect new tabs using DNR rules', async ({ context }) => {
    const worker = await getServiceWorker(context);

    // Go to popup and add a rule to trigger redirect
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${worker.url().split('/')[2]}/html/popup.html`);
    await popup.fill('#sourceUrl', 'example.edu');
    await popup.fill('#targetUrl', 'google.com');
    await popup.click('#addRuleBtn');
    await popup.waitForTimeout(100); // Allow time for message to be processed

    // Open a NEW tab to the source URL
    const page = await context.newPage();

    // Mock the source page
    await page.route('https://example.edu/', async (route) => {
      await route.fulfill({ status: 200, body: 'Source Page' });
    });

    await page.goto('https://example.edu/');

    // Verify redirect
    await expect(page).toHaveURL(/google\.com/);
  });
});
