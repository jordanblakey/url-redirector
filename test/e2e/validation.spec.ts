import { test, expect } from '../fixtures';

test.describe('Rule Validation', () => {
  test.beforeEach(async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/html/options.html`);
  });

  test('should prevent adding invalid URL', async ({ page }) => {
    await page.fill('#sourceUrl', 'not-a-url');
    await page.fill('#targetUrl', 'google.com');

    await page.click('#addRuleBtn');

    const rulesList = page.locator('#rulesList');
    // It should fail to add, so count should be 0
    await expect(rulesList.locator('.rule-item')).toHaveCount(0);

    // Check for flash message
    const flashMessage = page.locator('.flash-message.error');
    await expect(flashMessage).toBeVisible();
    await expect(flashMessage).toContainText(/Invalid Source URL|enter a valid URL/i);

    // Capture screenshot of the error message
    await page.screenshot({
      path: 'test/artifacts/screenshots/options-invalid-url-error.png',
      fullPage: true,
    });
  });

  test('should prevent adding duplicate source', async ({ page }) => {
    // Add first rule
    await page.fill('#sourceUrl', 'example.com');
    await page.fill('#targetUrl', 'target1.com');
    await page.click('#addRuleBtn');

    // Try to add duplicate source
    await page.fill('#sourceUrl', 'example.com');
    await page.fill('#targetUrl', 'target2.com');

    await page.click('#addRuleBtn');

    // Expect only 1 rule
    const rulesList = page.locator('#rulesList');
    await expect(rulesList.locator('.rule-item')).toHaveCount(1);

    // Check for flash message
    const flashMessage = page.locator('.flash-message.error');
    await expect(flashMessage).toBeVisible();
    await expect(flashMessage).toContainText(/Duplicate source|already exists/i);

    // Capture screenshot of the error message
    await page.screenshot({
      path: 'test/artifacts/screenshots/options-duplicate-source-error.png',
      fullPage: true,
    });
  });

  test('should prevent source and target being the same', async ({ page }) => {
    await page.fill('#sourceUrl', 'same.com');
    await page.fill('#targetUrl', 'same.com');

    await page.click('#addRuleBtn');

    const rulesList = page.locator('#rulesList');
    await expect(rulesList.locator('.rule-item')).toHaveCount(0);

    // Check for flash message
    const flashMessage = page.locator('.flash-message.error');
    await expect(flashMessage).toBeVisible();
    await expect(flashMessage).toContainText(/same/i);

    // Capture screenshot of the error message
    await page.screenshot({
      path: 'test/artifacts/screenshots/options-same-source-target-error.png',
      fullPage: true,
    });
  });
});
