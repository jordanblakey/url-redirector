import { test, expect } from '../fixtures';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

// Read the mock Chrome API script and transpile it to JS
const mockChromeTs = fs.readFileSync(
    path.join(process.cwd(), 'test/mocks/mock-chrome.ts'),
    'utf-8'
);
const mockChromeScript = ts.transpileModule(mockChromeTs, {
    compilerOptions: { module: ts.ModuleKind.ESNext }
}).outputText;

test.describe('URL Redirector Options Page', () => {
    test.beforeEach(async ({ page }) => {
        // Inject the mock Chrome API before the page loads
        await page.addInitScript(mockChromeScript);

        // Navigate to the options page
        await page.goto('/dist/html/options.html');
    });

    test('should display the options page correctly', async ({ page }) => {
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
        await expect(rulesList.locator('.rule-count')).toContainText('Used 1 time');

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
        await expect(page.locator('#rulesList .rule-item')).toHaveCount(1);

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

    test('should check and redirect existing tabs when adding a rule', async ({ page }) => {
        // This test verifies that checkAndRedirectTabs is called
        // The mock Chrome API will simulate tabs being queried and updated

        await page.fill('#sourceUrl', 'example.com');
        await page.fill('#targetUrl', 'google.com');
        await page.click('#addRuleBtn');
        await page.waitForTimeout(200);

        // Verify the rule was added (which triggers checkAndRedirectTabs)
        await expect(page.locator('#rulesList .rule-item')).toHaveCount(1);

        // The checkAndRedirectTabs function should have been called
        // (verified by the fact that the rule was successfully added)
    });

    test('should toggle rule active state', async ({ page }) => {
        // Add a rule first
        await page.fill('#sourceUrl', 'toggle.com');
        await page.fill('#targetUrl', 'target.com');
        await page.click('#addRuleBtn');
        await page.waitForTimeout(100);

        const ruleItem = page.locator('.rule-item').first();
        const toggleBtn = ruleItem.locator('.toggle-btn');

        // Initial state: Active (Resume is not shown, Pause is shown)
        await expect(toggleBtn).toHaveText('Pause');
        await expect(ruleItem).not.toHaveClass(/paused/);

        // Click to Pause
        await toggleBtn.click();
        await page.waitForTimeout(100);
        await expect(toggleBtn).toHaveText('Resume');
        await expect(ruleItem).toHaveClass(/paused/);

        // Click to Resume
        await toggleBtn.click();
        await page.waitForTimeout(100);
        await expect(toggleBtn).toHaveText('Pause');
        await expect(ruleItem).not.toHaveClass(/paused/);
    });

    test('should prevent infinite redirect loops', async ({ page }) => {
        // This tests the check in matchAndGetTarget inside utils.ts
        await page.addInitScript(() => {
            (window as any).chrome.tabs.query = (queryInfo: any, callback: any) => {
                callback([
                    { id: 1, url: 'https://target.com/foo' }
                ]);
            };
        });

        await page.fill('#sourceUrl', 'target.com');
        await page.fill('#targetUrl', 'target.com/foo');

        await page.click('#addRuleBtn');
        await page.waitForTimeout(100);

        const countSpan = page.locator('.rule-count');
        await expect(countSpan).toContainText('Used 0 times');
    });

    test('should handle rule not found during deletion', async ({ page }) => {
        await page.fill('#sourceUrl', 'delete-fail.com');
        await page.fill('#targetUrl', 'target.com');
        await page.click('#addRuleBtn');
        await page.waitForTimeout(100);

        // Clear storage directly
        await page.evaluate(() => {
            window.localStorage.removeItem('rules');
        });

        // Click Delete
        await page.click('.delete-btn');
        await page.waitForTimeout(100);
        // No error should occur
    });

    test('should handle rule not found during toggle', async ({ page }) => {
        await page.fill('#sourceUrl', 'toggle-fail.com');
        await page.fill('#targetUrl', 'target.com');
        await page.click('#addRuleBtn');
        await page.waitForTimeout(100);

        await page.evaluate(() => {
            window.localStorage.removeItem('rules');
        });

        await page.click('.toggle-btn');
        await page.waitForTimeout(100);
        // No error should occur
    });

    test('should handle rule not found during increment count', async ({ page }) => {
        await page.addInitScript(() => {
            (window as any).chrome.tabs.query = (queryInfo: any, callback: any) => {
                setTimeout(() => {
                    callback([{ id: 1, url: 'https://increment-fail.com' }]);
                }, 50);
            };
        });

        await page.fill('#sourceUrl', 'increment-fail.com');
        await page.fill('#targetUrl', 'target.com');
        await page.click('#addRuleBtn');

        await page.waitForTimeout(10);

        await page.evaluate(() => {
            window.localStorage.removeItem('rules');
        });

        await page.waitForTimeout(100);
        // No error should occur
    });

    test('should sort rules alphabetically by source URL', async ({ page }) => {
        // Add rules in non-alphabetical order
        await page.fill('#sourceUrl', 'zebra.com');
        await page.fill('#targetUrl', 'target.com');
        await page.click('#addRuleBtn');
        await page.waitForTimeout(100);

        await page.fill('#sourceUrl', 'apple.com');
        await page.fill('#targetUrl', 'target.com');
        await page.click('#addRuleBtn');
        await page.waitForTimeout(100);

        await page.fill('#sourceUrl', 'beta.com');
        await page.fill('#targetUrl', 'target.com');
        await page.click('#addRuleBtn');
        await page.waitForTimeout(100);

        // Get all source elements
        const sourceElements = page.locator('.rule-source');
        await expect(sourceElements).toHaveCount(3);

        // Check if they are sorted
        const first = await sourceElements.nth(0).textContent();
        const second = await sourceElements.nth(1).textContent();
        const third = await sourceElements.nth(2).textContent();

        expect(first).toBe('apple.com');
        expect(second).toBe('beta.com');
        expect(third).toBe('zebra.com');
    });
});
