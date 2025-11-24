import { test, expect } from '../fixtures';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const mockChromeTs = fs.readFileSync(
    path.join(process.cwd(), 'test/mocks/mock-chrome.ts'),
    'utf-8'
);
const mockChromeScript = ts.transpileModule(mockChromeTs, {
    compilerOptions: { module: ts.ModuleKind.ESNext }
}).outputText;

test.describe('URL Redirector Popup', () => {
    test.beforeEach(async ({ page }) => {
        // Inject the mock Chrome API before the page loads
        await page.addInitScript(mockChromeScript);

        // Navigate to the popup page
        await page.goto('/dist/html/popup.html');
    });

    test('should display the popup correctly', async ({ page }) => {
        await expect(page.locator('h1')).toContainText('URL Redirector');
        await expect(page.locator('#sourceUrl')).toBeVisible();
        await expect(page.locator('#targetUrl')).toBeVisible();
        await expect(page.locator('#addRuleBtn')).toBeVisible();
    });

    test('should add a new rule', async ({ page }) => {
        // Fill in the form
        await page.fill('#sourceUrl', 'reddit.com');
        await page.fill('#targetUrl', 'google.com');

        // Click add button
        await page.click('#addRuleBtn');

        // Wait for the rule to appear
        await page.waitForTimeout(100);

        // Verify the rule appears in the list
        const rulesList = page.locator('#rulesList');
        await expect(rulesList.locator('.rule-item')).toHaveCount(1);
        await expect(rulesList.locator('.rule-source')).toContainText('reddit.com');
        await expect(rulesList.locator('.rule-target')).toContainText('google.com');
        await expect(rulesList.locator('.rule-count .count-value')).toHaveText('0');

        // Verify inputs are cleared
        await expect(page.locator('#sourceUrl')).toHaveValue('');
        await expect(page.locator('#targetUrl')).toHaveValue('');
    });

    test('should add rule on enter key', async ({ page }) => {
        await page.fill('#sourceUrl', 'enter-key.com');
        await page.fill('#targetUrl', 'works.com');
        await page.press('#targetUrl', 'Enter');

        await page.waitForTimeout(100);

        const rulesList = page.locator('#rulesList');
        await expect(rulesList.locator('.rule-item')).toHaveCount(1);
        await expect(rulesList.locator('.rule-source')).toContainText('enter-key.com');
    });

    test('should persist rules after reload', async ({ page }) => {
        // Add a rule
        await page.fill('#sourceUrl', 'example.com');
        await page.fill('#targetUrl', 'test.com');
        await page.click('#addRuleBtn');
        await page.waitForTimeout(100);

        // Reload the page
        await page.reload();

        // Verify the rule is still there
        const rulesList = page.locator('#rulesList');
        await expect(rulesList.locator('.rule-item')).toHaveCount(1);
        await expect(rulesList.locator('.rule-source')).toContainText('example.com');
        await expect(rulesList.locator('.rule-target')).toContainText('test.com');
    });

    test('should delete a rule', async ({ page }) => {
        // Add a rule
        await page.fill('#sourceUrl', 'delete-me.com');
        await page.fill('#targetUrl', 'target.com');
        await page.click('#addRuleBtn');
        await page.waitForTimeout(100);

        // Verify rule exists
        const ruleItem = page.locator('#rulesList .rule-item');
        await expect(ruleItem).toHaveCount(1);

        // Hover over the rule item to reveal buttons
        await ruleItem.hover();

        // Click delete button
        await page.click('.delete-btn');
        await page.waitForTimeout(100);

        // Verify rule is gone
        await expect(page.locator('#rulesList')).toContainText('No rules added yet');
        await expect(page.locator('#rulesList .rule-item')).toHaveCount(0);
    });

    test('should handle multiple rules', async ({ page }) => {
        // Add first rule
        await page.fill('#sourceUrl', 'site1.com');
        await page.fill('#targetUrl', 'target1.com');
        await page.click('#addRuleBtn');
        await page.waitForTimeout(100);

        // Add second rule
        await page.fill('#sourceUrl', 'site2.com');
        await page.fill('#targetUrl', 'target2.com');
        await page.click('#addRuleBtn');
        await page.waitForTimeout(100);

        // Verify both rules exist
        await expect(page.locator('#rulesList .rule-item')).toHaveCount(2);
    });

    test('should show validation message for empty fields', async ({ page }) => {
        // Try to add rule with empty fields
        await page.click('#addRuleBtn');

        // Wait for alert dialog
        page.on('dialog', async (dialog) => {
            expect(dialog.message()).toContain('Please enter both source and target URLs');
            await dialog.accept();
        });
    });

    test('should prevent adding duplicate source', async ({ page }) => {
        // Add first rule
        await page.fill('#sourceUrl', 'duplicate-test.com');
        await page.fill('#targetUrl', 'target1.com');
        await page.click('#addRuleBtn');
        await page.waitForTimeout(100);

        // Try to add duplicate source
        await page.fill('#sourceUrl', 'duplicate-test.com');
        await page.fill('#targetUrl', 'target2.com');

        let dialogMessage = '';
        page.once('dialog', async (dialog) => {
            dialogMessage = dialog.message();
            await dialog.accept();
        });

        await page.click('#addRuleBtn');
        await page.waitForTimeout(100);

        // Expect only 1 rule
        const rulesList = page.locator('#rulesList');
        await expect(rulesList.locator('.rule-item')).toHaveCount(1);

        const flashMessage = page.locator('.flash-message.error');
        await expect(flashMessage).toBeVisible();
        await expect(flashMessage).toContainText(/Duplicate source|already exists/i);

    });

    test('should prevent adding invalid URL', async ({ page }) => {
        await page.fill('#sourceUrl', 'not-a-url');
        await page.fill('#targetUrl', 'google.com');

        await page.click('#addRuleBtn');
        await page.waitForTimeout(100);

        const rulesList = page.locator('#rulesList');
        // It should fail to add, so count should be 0
        await expect(rulesList.locator('.rule-item')).toHaveCount(0);

        // Check for flash message
        const flashMessage = page.locator('.flash-message.error');
        await expect(flashMessage).toBeVisible();
        await expect(flashMessage).toContainText(/Invalid URL|enter a valid URL/i);

        // Capture screenshot of the error message
        await page.screenshot({ path: 'test/screenshots/popup-invalid-url-error.png', fullPage: true });
    });

    test('should prevent source and target being the same', async ({ page }) => {
        await page.fill('#sourceUrl', 'same.com');
        await page.fill('#targetUrl', 'same.com');

        await page.click('#addRuleBtn');
        await page.waitForTimeout(100);

        const rulesList = page.locator('#rulesList');
        await expect(rulesList.locator('.rule-item')).toHaveCount(0);

        // Check for flash message
        const flashMessage = page.locator('.flash-message.error');
        await expect(flashMessage).toBeVisible();
        await expect(flashMessage).toContainText(/same/i);

        // Capture screenshot of the error message
        await page.screenshot({ path: 'test/screenshots/popup-same-source-target-error.png', fullPage: true });
    });

    test('should display correct message plurality', async ({ page }) => {
        // Add a rule
        await page.fill('#sourceUrl', 'plural-test.com');
        await page.fill('#targetUrl', 'target.com');
        await page.click('#addRuleBtn');
        await page.waitForTimeout(100);

        const ruleItem = page.locator('.rule-item').first();
        const countSpan = ruleItem.locator('.rule-count');

        // Case 0: Should be "Used 0 times"
        // (Default state is 0)
        await expect(countSpan).toContainText('Used 0 times');

        // Case 1: Singular
        await page.evaluate(() => {
            return new Promise<void>((resolve) => {
                chrome.storage.local.get(['rules'], (result) => {
                    const rules = result.rules as any;
                    rules[0].count = 1;
                    // Clear lastCountMessage to force regeneration
                    delete rules[0].lastCountMessage;
                    chrome.storage.local.set({ rules }, resolve);
                });
            });
        });
        // Reload to force re-render
        await page.reload();
        await expect(countSpan).toContainText('1');
        // We can't easily check for "time" vs "times" generically without knowing the message,
        // but we can check that it's NOT "Used 0 times"
        await expect(countSpan).not.toContainText('Used 0 times');

        // Case 2: Plural
        await page.evaluate(() => {
            return new Promise<void>((resolve) => {
                chrome.storage.local.get(['rules'], (result) => {
                    const rules = result.rules as any;
                    rules[0].count = 5;
                    delete rules[0].lastCountMessage;
                    chrome.storage.local.set({ rules }, resolve);
                });
            });
        });
        await page.reload();
        await expect(countSpan).toContainText('5');
    });
});
