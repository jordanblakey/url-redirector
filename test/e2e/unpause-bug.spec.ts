import { test, expect, getServiceWorker } from '../fixtures';

test.describe('Unpause Bug', () => {
  test('should not unpause other rules when one rule is unpaused', async ({ context, page }) => {
    const worker = await getServiceWorker(context);
    const now = Date.now();
    const pauseDuration = 60000; // 1 minute

    // Setup: Two rules, both paused
    await worker.evaluate(
      async ({ now, pauseDuration }) => {
        const rules = [
          {
            source: 'rule-a.com',
            target: 'target.com',
            active: true,
            count: 0,
            id: 1,
            pausedUntil: now + pauseDuration,
          },
          {
            source: 'rule-b.com',
            target: 'target.com',
            active: true,
            count: 0,
            id: 2,
            pausedUntil: now + pauseDuration,
          },
        ];
        await (self as any).storage.saveRules(rules);
      },
      { now, pauseDuration },
    );

    // Mock network
    await page.route('**/*', (route) => {
      const url = route.request().url();
      const hostname = new URL(url).hostname;
      if (hostname === 'rule-a.com' || hostname === 'rule-b.com') {
        return route.fulfill({ status: 200, body: 'Source Page' });
      }
      if (hostname === 'target.com') {
        return route.fulfill({ status: 200, body: 'Target Page' });
      }
      return route.continue();
    });

    // Verify Rule B is paused
    await page.goto('https://rule-b.com/');
    await expect(page).toHaveURL(/rule-b\.com/);

    // Unpause Rule A
    await worker.evaluate(async () => {
      const rules = await (self as any).storage.getRules();
      const ruleA = rules.find((r: any) => r.id === 1);
      if (ruleA) {
        delete ruleA.pausedUntil;
        await (self as any).storage.saveRules(rules);
        // Simulate UI behavior: Send message immediately after save
        chrome.runtime.sendMessage({ type: 'RULES_UPDATED' });
      }
    });

    // Immediately check Rule B. It should STILL be paused.
    // We check this by trying to navigate to it.
    // If the bug exists, this might redirect to target.com
    await page.goto('https://rule-b.com/');
    await expect(page).toHaveURL(/rule-b\.com/);

    // Also check Rule A is active
    await page.goto('https://rule-a.com/');
    await expect(page).toHaveURL(/target\.com/);
  });
});
