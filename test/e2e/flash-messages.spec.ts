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

test.describe('Flash Messages', () => {
    test.beforeEach(async ({ page }) => {
        // Inject the mock Chrome API before the page loads
        await page.addInitScript(mockChromeScript);

        // Navigate to the options page
        await page.goto('/dist/html/options.html');
    });

    test('should show flash message for empty fields', async ({ page }) => {
        // Try to add rule with empty fields
        await page.click('#addRuleBtn');

        // Check for flash message
        const flashMessage = page.locator('.flash-message.error');
        await expect(flashMessage).toBeVisible();
        await expect(flashMessage).toHaveText('Please enter both source and target URLs.');

        // Take screenshot
        await page.screenshot({ path: 'test/screenshots/flash-empty-fields.png' });
    });

    test('should show flash message for invalid URL', async ({ page }) => {
        await page.fill('#sourceUrl', 'invalid-url');
        await page.fill('#targetUrl', 'google.com');
        await page.click('#addRuleBtn');

        const flashMessage = page.locator('.flash-message.error');
        await expect(flashMessage).toBeVisible();
        await expect(flashMessage).toContainText('Invalid URL');

        await page.screenshot({ path: 'test/screenshots/flash-invalid-url.png' });
    });

    test('should show flash message for duplicate source', async ({ page }) => {
        // Add a rule first
        await page.fill('#sourceUrl', 'duplicate.com');
        await page.fill('#targetUrl', 'google.com');
        await page.click('#addRuleBtn');

        // Wait for success message to disappear or just wait a bit
        await page.waitForTimeout(3500);

        // Try to add the same rule again
        await page.fill('#sourceUrl', 'duplicate.com');
        await page.fill('#targetUrl', 'yahoo.com');
        await page.click('#addRuleBtn');

        const flashMessage = page.locator('.flash-message.error');
        await expect(flashMessage).toBeVisible();
        await expect(flashMessage).toHaveText('Duplicate source. A rule for this source URL already exists.');

        await page.screenshot({ path: 'test/screenshots/flash-duplicate-source.png' });
    });

    test('should show success message when rule is added', async ({ page }) => {
        await page.fill('#sourceUrl', 'success.com');
        await page.fill('#targetUrl', 'google.com');
        await page.click('#addRuleBtn');

        const flashMessage = page.locator('.flash-message.success');
        await expect(flashMessage).toBeVisible();
        await expect(flashMessage).toHaveText('Rule added successfully!');

        await page.screenshot({ path: 'test/screenshots/flash-rule-added.png' });
    });
});
