import { test, expect } from '../fixtures';
import type { Rule } from '../../src/types';

test.describe('Redirect page', () => {
  test('should allow temporary override of a rule', async ({ page }) => {
    let rules: Rule[] = [{
      id: 123,
      source: 'https://example.com/',
      target: 'https://example.org/',
      active: true,
      count: 0
    }];

    await page.exposeFunction('getRulesForTest', () => rules);
    await page.exposeFunction('setRulesForTest', (newRules: Rule[]) => {
      rules = newRules;
    });

    await page.addInitScript(() => {
      window.chrome = {
        storage: {
          local: {
            get: (_, callback) => (window as any).getRulesForTest().then((r: Rule[]) => callback({ rules: r })),
            set: (items, callback) => (window as any).setRulesForTest(items.rules).then(callback)
          }
        },
        runtime: { getURL: (path: string) => path, id: 'test-id' }
      };
    });

    // Intercept navigation to the source URL and provide a dummy response
    await page.route('https://example.com/', route => {
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<h1>Welcome to Example.com</h1>'
      });
    });

    // Navigate to the redirect page
    await page.goto('/dist/html/redirect.html?source=https://example.com/&target=https://example.org/&ruleId=123');

    // Click the override button to show the confirmation container
    await page.click('#overrideBtn');

    // Check the countdown
    const confirmButton = page.locator('[data-testid="confirm-override-button"]');
    await expect(confirmButton).toBeDisabled();
    await expect(confirmButton).toHaveText('Confirm Override (5)');
    await expect(confirmButton).toHaveText('Confirm Override (4)', { timeout: 2000 });
    await expect(confirmButton).toHaveText('Confirm Override (3)', { timeout: 2000 });
    await expect(confirmButton).toHaveText('Confirm Override (2)', { timeout: 2000 });
    await expect(confirmButton).toHaveText('Confirm Override (1)', { timeout: 2000 });

    // Wait for the button to be enabled and click it
    await expect(confirmButton).toBeEnabled({ timeout: 2000 });
    await expect(confirmButton).toHaveText('Confirm Override');
    await confirmButton.click();

    // Wait for the navigation to our intercepted route to complete
    await page.waitForURL('https://example.com/');
    await expect(page.locator('h1')).toHaveText('Welcome to Example.com');

    // Now check the state in the test runner
    expect(rules).toHaveLength(1);
    expect(rules[0].overrideUntil).toBeDefined();
    expect(rules[0].overrideUntil!).toBeGreaterThan(Date.now());
  });
});
