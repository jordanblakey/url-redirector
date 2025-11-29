import { test, expect, getServiceWorker } from '../fixtures';

test.describe('URL Redirector Pause Functionality', () => {
  test.beforeEach(async ({ page, extensionId }) => {
    // Navigate to the popup page
    await page.goto(`chrome-extension://${extensionId}/html/popup.html`);
  });

  test('should toggle rule pause state', async ({ page, httpServer, extensionId }) => {
    const source = httpServer; // Use the actual server URL as source
    const target = 'http://example.com';

    await page.fill('#sourceUrl', source);
    await page.fill('#targetUrl', target);
    await page.click('#addRuleBtn');

    // Verify rule exists and is active by default
    const ruleItem = page.locator('#rulesList .rule-item').first();
    await expect(ruleItem).not.toHaveClass(/paused/);

    // Verify redirect works
    await page.goto(source);
    await expect(page).toHaveURL(/example\.com/);

    // Go back to popup
    await page.goto(`chrome-extension://${extensionId}/html/popup.html`);

    // Hover to reveal buttons
    await ruleItem.hover();
    const toggleBtn = ruleItem.locator('.toggle-btn');

    // Click pause
    await toggleBtn.click();
    await expect(ruleItem).toHaveClass(/paused/);

    // Verify redirect DOES NOT work
    await page.goto(source);
    await expect(page).toHaveURL(source); // Should stay on source

    // Go back to popup
    await page.goto(`chrome-extension://${extensionId}/html/popup.html`);

    // Click resume
    await ruleItem.hover();
    await toggleBtn.click();
    await expect(ruleItem).not.toHaveClass(/paused/);

    // Verify rule is active again
    await expect(ruleItem).not.toHaveClass(/paused/);

    // Verify redirect works again
    await page.goto(source);
    await expect(page).toHaveURL(/example\.com/);
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
