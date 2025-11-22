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
        await page.goto('/dist/popup.html');
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
        await expect(rulesList.locator('.rule-count')).toContainText('Used 0 times');

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
});
