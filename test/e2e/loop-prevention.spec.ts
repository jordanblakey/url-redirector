import { test, expect } from '../fixtures';

test.describe('Loop Prevention', () => {
  test('should prevent adding a rule that creates a direct loop', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/html/popup.html`);

    await page.fill('#sourceUrl', 'example.com');
    await page.fill('#targetUrl', 'example.com');
    await page.click('#addRuleBtn');

    await expect(page.locator('body')).toContainText('Source and target cannot be the same');
  });

  test('should prevent adding a rule that creates an indirect loop', async ({
    page,
    extensionId,
  }) => {
    await page.goto(`chrome-extension://${extensionId}/html/popup.html`);

    // Add A -> B
    await page.fill('#sourceUrl', 'site-a.com');
    await page.fill('#targetUrl', 'site-b.com');
    await page.click('#addRuleBtn');
    await expect(page.locator('body')).toContainText('Rule added successfully');

    // Try adding B -> A
    await page.fill('#sourceUrl', 'site-b.com');
    await page.fill('#targetUrl', 'site-a.com');
    await page.click('#addRuleBtn');

    await expect(page.locator('body')).toContainText(
      'Are you mad?! This rule would create an infinite loop!',
    );
  });
});
