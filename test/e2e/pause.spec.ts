import { test, expect } from '../fixtures';

test.describe('URL Redirector Pause Functionality', () => {
  test.beforeEach(async ({ page, extensionId }) => {
    // Navigate to the popup page
    await page.goto(`chrome-extension://${extensionId}/html/popup.html`);
  });

  test('should toggle rule pause state', async ({ page }) => {
    // Add a rule
    await page.fill('#sourceUrl', 'pause-test.com');
    await page.fill('#targetUrl', 'target.com');
    await page.click('#addRuleBtn');

    // Verify rule exists and is active by default
    const ruleItem = page.locator('#rulesList .rule-item').first();
    await expect(ruleItem).not.toHaveClass(/paused/);

    // Hover to reveal buttons
    await ruleItem.hover();

    const toggleBtn = ruleItem.locator('.toggle-btn');
    await expect(toggleBtn).not.toHaveClass(/paused/);

    // Click pause
    await toggleBtn.click();

    // Hover again
    await ruleItem.hover();

    // Verify rule is paused
    await expect(ruleItem).toHaveClass(/paused/);
    await expect(toggleBtn).toHaveClass(/paused/);

    // Click resume
    await toggleBtn.click();

    // Hover again
    await ruleItem.hover();

    // Verify rule is active again
    await expect(ruleItem).not.toHaveClass(/paused/);
    await expect(toggleBtn).not.toHaveClass(/paused/);
  });

  test('should persist pause state after reload', async ({ page }) => {
    // Add a rule
    await page.fill('#sourceUrl', 'persist-pause.com');
    await page.fill('#targetUrl', 'target.com');
    await page.click('#addRuleBtn');

    // Pause the rule
    const ruleItem = page.locator('#rulesList .rule-item').first();
    await ruleItem.hover();
    await ruleItem.locator('.toggle-btn').click();

    // Reload page
    await page.reload();

    // Verify rule is still paused
    const reloadedRuleItem = page.locator('#rulesList .rule-item').first();
    await reloadedRuleItem.hover();
    await expect(reloadedRuleItem).toHaveClass(/paused/);
  });
});
