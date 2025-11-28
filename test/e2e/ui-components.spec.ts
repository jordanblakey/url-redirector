import { test, expect } from '../fixtures';
import { Rule } from '../../src/types';

test.describe('UI Components', () => {
  test.beforeEach(async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/html/options.html`);
  });

  test.describe('Placeholder Buttons', () => {
    test('should copy placeholder text to input and show visual feedback', async ({ page }) => {
      // Options page has input fields with placeholders
      // e.g., Source URL and Target URL might have placeholders like "e.g. example.com"

      // Check if placeholder buttons exist (they are added by UI logic if elements exist)
      // But in options.html, do we have them?
      // Let's verify structure by checking the page content or assuming implementation match
      // The memory says: "The Options page... implements a "use placeholder" feature where inputs... are wrapped in .input-wrapper divs"

      const sourceInput = page.locator('#sourceUrl');
      const targetInput = page.locator('#targetUrl');

      // We need to make sure the inputs have placeholders that start with "e.g. " for the logic to strip it
      // Assuming standard options.html structure.

      // Find the placeholder button for sourceUrl
      const sourceBtn = page.locator('button.use-placeholder-btn[data-input-id="sourceUrl"]');

      // If button is hidden (opacity 0 until hover), we might need to hover the wrapper
      const sourceWrapper = page.locator('.input-wrapper').filter({ has: sourceInput });
      await sourceWrapper.hover();

      await expect(sourceBtn).toBeVisible();

      // Click the button
      await sourceBtn.click();

      // Check input value (should be the placeholder without "e.g. ")
      // We need to know the placeholder value.
      // Let's get the placeholder attribute first.
      const placeholder = await sourceInput.getAttribute('placeholder');
      const expectedValue = placeholder?.replace(/^e\.g\.\s+/, '') || '';

      await expect(sourceInput).toHaveValue(expectedValue);

      // Check visual feedback (color change to success color)
      // We can't easily check color transition timing accurately in E2E without being flaky,
      // but we can check if the style attribute was updated or class added.
      // The code updates `style.color`.
      // Using toHaveCSS is more robust than checking style attribute string
      await expect(sourceBtn).toHaveCSS('color', 'rgb(16, 185, 129)');
    });
  });

  test.describe('Pause Countdown', () => {
    test('should update pause button text with countdown', async ({ page }) => {
      // Add a rule
      await page.fill('#sourceUrl', 'pause-test.com');
      await page.fill('#targetUrl', 'target.com');
      await page.click('#addRuleBtn');

      const ruleItem = page.locator('.rule-item').first();
      const toggleBtn = ruleItem.locator('.toggle-btn');

      // Pause the rule
      await ruleItem.hover();
      await toggleBtn.click();

      // It should now say "Paused (5m)" (default is 5 minutes)
      await expect(toggleBtn).toContainText(/Paused \(5m\)/);

      // We want to verify it updates.
      // We can cheat by modifying the pausedUntil in storage to be sooner.

      const now = Date.now();
      const fewSecondsLater = now + 5000; // 5 seconds remaining

      await page.evaluate((timestamp) => {
        return new Promise<void>((resolve) => {
          chrome.storage.local.get(['rules'], (result) => {
            const rules = result.rules as any;
            if (rules && rules.length > 0) {
              rules[0].pausedUntil = timestamp;
              chrome.storage.local.set({ rules }, resolve);
            } else {
              resolve();
            }
          });
        });
      }, fewSecondsLater);

      // Trigger an update (the updatePauseButtons is called via setInterval?
      // Use grep to find how updatePauseButtons is called.
      // It might be called in a loop in options.ts/popup.ts)

      // Wait a bit for the interval to tick (usually 1 sec)

      // Trigger a re-render or wait for update
      // Since we updated storage, the interval in options.ts (which reads data-paused-until)
      // will try to update the text based on dataset.

      // But wait, updatePauseButtons reads `data-paused-until` from the DOM element!
      // It does NOT read from storage.
      // So updating storage alone won't change the DOM immediately unless we trigger a re-render.

      // We need to update the dataset on the button itself or reload the rules list.
      // Reloading the page is the easiest way to fetch new storage state.
      await page.reload();

      // After reload, find element again
      const newToggleBtn = page.locator('.rule-item').first().locator('.toggle-btn');

      // Should now show seconds
      // The regex matching might be failing if it still says "Paused (5m)" because the remaining time calculation
      // yielded > 60 seconds still.
      // We set it to now + 5000 (5 seconds).
      // So it should be Paused (5s).
      await expect(newToggleBtn).toContainText(/Paused \([0-9]+s\)/);
    });
  });

  test.describe('Favicons', () => {
    test('should render correct Google S2 favicon URLs', async ({ page }) => {
      await page.fill('#sourceUrl', 'github.com');
      await page.fill('#targetUrl', 'stackoverflow.com');
      await page.click('#addRuleBtn');

      const ruleItem = page.locator('.rule-item').first();

      // Check source favicon
      const sourceFavicon = ruleItem.locator('.rule-favicon').first();
      const sourceStyle = await sourceFavicon.getAttribute('style');
      expect(sourceStyle).toContain('google.com/s2/favicons?domain=github.com');

      // Check target favicon
      const targetFavicon = ruleItem.locator('.rule-favicon').nth(1);
      const targetStyle = await targetFavicon.getAttribute('style');
      expect(targetStyle).toContain('google.com/s2/favicons?domain=stackoverflow.com');
    });
  });
});
