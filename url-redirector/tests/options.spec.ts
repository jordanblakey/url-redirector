import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Read the mock Chrome API script
// Note: We need to compile the mock script to JS first or read the TS file and transpile it on the fly.
// For simplicity in this setup, we'll read the TS file but since it's simple TS (mostly JS),
// we might need to strip types if we inject it directly.
// However, since we are using tsc to build, we should probably use the compiled output if available,
// or just write the mock in JS since it's injected into the browser.
// Actually, let's read the TS file and assume it's valid JS (which it is mostly, except for type annotations).
// Wait, type annotations will cause syntax errors in the browser.
// We should probably keep mock-chrome as JS or compile it.
// Let's revert mock-chrome to JS for simplicity of injection, or compile it.
// Since we have a build step, let's assume we want to test the built extension.
// But the mock is for the *test environment*, not the extension itself.
// Let's use a simple trick: we'll keep mock-chrome.ts but we'll need to transpile it before injection.
// Or simpler: just write the mock in JS inside the test file or keep it as a JS file.
// Given the complexity of transpiling on the fly, let's keep mock-chrome.js as a JS file for now,
// or manually strip types.

// actually, let's just use the JS version of the mock for injection.
// I'll revert mock-chrome.ts to mock-chrome.js in the next step if needed,
// but for now let's try to read the TS file and see if it works (it won't due to types).
// So I will rewrite the mock-chrome.ts to be valid JS (using JSDoc for types if needed) or just keep it JS.
// Let's stick to JS for the mock to avoid complication.

const mockChromeScript = fs.readFileSync(
    path.join(process.cwd(), 'test/mock-chrome.js'),
    'utf-8'
);

test.describe('URL Redirector Options Page', () => {
    test.beforeEach(async ({ page }) => {
        // Inject the mock Chrome API before the page loads
        await page.addInitScript(mockChromeScript);

        // Navigate to the options page
        await page.goto('/options.html');
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
