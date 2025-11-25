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

test.describe('Shuffle Mode', () => {
    test.beforeEach(async ({ page }) => {
        // Inject the mock Chrome API before the page loads
        await page.addInitScript(mockChromeScript);

        await page.goto('/dist/html/options.html');
        await page.waitForLoadState('networkidle');
    });

    test('should change button text to "Add Shuffle Rule" when target is empty', async ({ page }) => {
        // Initially "Add Rule"
        await expect(page.locator('#addRuleBtn')).toHaveText('Add Rule');

        // Enter source
        await page.fill('#sourceUrl', 'shuffle-test.com');

        // Should be "Add Shuffle Rule" because target is empty
        await expect(page.locator('#addRuleBtn')).toHaveText('Add Shuffle Rule');

        // Enter target
        await page.fill('#targetUrl', 'example.com');

        // Should be "Add Rule" again
        await expect(page.locator('#addRuleBtn')).toHaveText('Add Rule');

        // Clear target
        await page.fill('#targetUrl', '');
        await expect(page.locator('#addRuleBtn')).toHaveText('Add Shuffle Rule');
    });

    test('should add a shuffle rule and display it correctly', async ({ page }) => {
        const sourceUrl = 'shuffle-source.com';

        await page.fill('#sourceUrl', sourceUrl);
        await expect(page.locator('#addRuleBtn')).toHaveText('Add Shuffle Rule');

        await page.click('#addRuleBtn');

        // Verify rule is added to the list
        const ruleItem = page.locator('.rule-item').filter({ hasText: sourceUrl });
        await expect(ruleItem).toBeVisible();

        // Verify display text
        await expect(ruleItem.locator('.rule-target')).toHaveText('🔀 shuffle');

        // Verify storage
        // (We can't directly check storage easily without mock, but UI check confirms it was treated as shuffle)
    });
});
