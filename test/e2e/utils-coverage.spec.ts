import { test, expect, getServiceWorker } from '../fixtures';

test.describe('Utils Coverage - E2E', () => {
  test.describe('URL Matching and Redirection', () => {
    test('should handle protocol normalization (http vs https)', async ({ context, extensionId }) => {
      // Go to popup and add a rule
      const popup = await context.newPage();
      await popup.goto(`chrome-extension://${extensionId}/html/popup.html`);
      await popup.fill('#sourceUrl', 'http-test.com');
      await popup.fill('#targetUrl', 'google.com');
      await popup.click('#addRuleBtn');
      await popup.waitForTimeout(100);

      const page = await context.newPage();

      await page.route('https://http-test.com/', async (route) => {
        await route.fulfill({ status: 200, body: 'Source Page' });
      });

      await page.goto('https://http-test.com/');
      await expect(page).toHaveURL(/google\.com/);
    });

    test('should handle www normalization', async ({ context, extensionId }) => {
      // Go to popup and add a rule
      const popup = await context.newPage();
      await popup.goto(`chrome-extension://${extensionId}/html/popup.html`);
      await popup.fill('#sourceUrl', 'www-test.com');
      await popup.fill('#targetUrl', 'google.com');
      await popup.click('#addRuleBtn');
      await popup.waitForTimeout(100);

      const page = await context.newPage();

      await page.route('https://www.www-test.com/', async (route) => {
        await route.fulfill({ status: 200, body: 'Source Page' });
      });

      await page.goto('https://www.www-test.com/');
      await expect(page).toHaveURL(/google\.com/);
    });

    test('should add https protocol to target if missing', async ({ context, extensionId }) => {
      // Go to popup and add a rule
      const popup = await context.newPage();
      await popup.goto(`chrome-extension://${extensionId}/html/popup.html`);
      await popup.fill('#sourceUrl', 'protocol-test.com');
      await popup.fill('#targetUrl', 'example.com'); // No protocol
      await popup.click('#addRuleBtn');
      await popup.waitForTimeout(100);

      const page = await context.newPage();

      // Mock source and target
      await page.route('https://protocol-test.com/', async (route) => {
        await route.fulfill({ status: 200, body: 'Source Page' });
      });
      await page.route('https://example.com/', async (route) => {
        await route.fulfill({ status: 200, body: 'Target Page' });
      });

      await page.goto('https://protocol-test.com/');
      await expect(page).toHaveURL(/https:\/\/example\.com/);
    });

    test('should match URL with path', async ({ context, extensionId }) => {
      // Go to popup and add a rule
      const popup = await context.newPage();
      await popup.goto(`chrome-extension://${extensionId}/html/popup.html`);
      await popup.fill('#sourceUrl', 'path-test.com');
      await popup.fill('#targetUrl', 'google.com');
      await popup.click('#addRuleBtn');
      await popup.waitForTimeout(100);

      const page = await context.newPage();

      await page.route('https://path-test.com/some/path', async (route) => {
        await route.fulfill({ status: 200, body: 'Source Page' });
      });

      await page.goto('https://path-test.com/some/path');

      // Should redirect even with path
      await expect(page).toHaveURL(/google\.com/);
    });
  });

  test.describe('URL Validation', () => {
    test('should reject invalid URL in popup', async ({ page, extensionId }) => {
      await page.goto(`chrome-extension://${extensionId}/html/popup.html`);

      await page.fill('#sourceUrl', 'not a valid url!!!');
      await page.fill('#targetUrl', 'google.com');
      await page.click('#addRuleBtn');

      // Should show validation error
      const flashMessage = page.locator('.flash-message');
      await expect(flashMessage).toBeVisible();
      await expect(flashMessage).toContainText('Invalid Source URL');
    });

    test('should reject invalid target URL in popup', async ({ page, extensionId }) => {
      await page.goto(`chrome-extension://${extensionId}/html/popup.html`);

      await page.fill('#sourceUrl', 'valid.com');
      await page.fill('#targetUrl', 'not valid!!!');
      await page.click('#addRuleBtn');

      // Should show validation error
      const flashMessage = page.locator('.flash-message');
      await expect(flashMessage).toBeVisible();
      await expect(flashMessage).toContainText('Invalid Target URL');
    });

    test('should accept valid domain without protocol', async ({ page, extensionId }) => {
      await page.goto(`chrome-extension://${extensionId}/html/popup.html`);

      await page.fill('#sourceUrl', 'valid-domain.com');
      await page.fill('#targetUrl', 'target-domain.com');
      await page.click('#addRuleBtn');

      // Should add successfully
      const rulesList = page.locator('#rulesList');
      await expect(rulesList.locator('.rule-item')).toHaveCount(1);
    });

    test('should accept valid URL with protocol', async ({ page, extensionId }) => {
      await page.goto(`chrome-extension://${extensionId}/html/popup.html`);

      await page.fill('#sourceUrl', 'https://protocol.com');
      await page.fill('#targetUrl', 'https://target.com');
      await page.click('#addRuleBtn');

      // Should add successfully
      const rulesList = page.locator('#rulesList');
      await expect(rulesList.locator('.rule-item')).toHaveCount(1);
    });
  });
});
