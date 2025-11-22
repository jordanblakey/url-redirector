import { test, expect } from '../fixtures';
import fs from 'fs';
import path from 'path';

const mockChromeScript = fs.readFileSync(
    path.join(process.cwd(), 'test/mocks/mock-chrome.js'),
    'utf-8'
);

test.describe('Rule Validation', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(mockChromeScript);
        await page.goto('/dist/options.html');
    });

    test('should prevent adding invalid URL', async ({ page }) => {
        await page.fill('#sourceUrl', 'not-a-url');
        await page.fill('#targetUrl', 'google.com');

        let dialogMessage = '';
        page.once('dialog', async (dialog) => {
            dialogMessage = dialog.message();
            await dialog.accept();
        });

        await page.click('#addRuleBtn');
        await page.waitForTimeout(100);

        const rulesList = page.locator('#rulesList');
        // It should fail to add, so count should be 0
        await expect(rulesList.locator('.rule-item')).toHaveCount(0);
        // And show an error message
        expect(dialogMessage).toMatch(/Invalid URL|enter a valid URL/i);
    });

    test('should prevent adding duplicate source', async ({ page }) => {
        // Add first rule
        await page.fill('#sourceUrl', 'example.com');
        await page.fill('#targetUrl', 'target1.com');
        await page.click('#addRuleBtn');
        await page.waitForTimeout(100);

        // Try to add duplicate source
        await page.fill('#sourceUrl', 'example.com');
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
        expect(dialogMessage).toMatch(/Duplicate source|already exists/i);
    });

    test('should prevent source and target being the same', async ({ page }) => {
        await page.fill('#sourceUrl', 'same.com');
        await page.fill('#targetUrl', 'same.com');

        let dialogMessage = '';
        page.once('dialog', async (dialog) => {
            dialogMessage = dialog.message();
            await dialog.accept();
        });

        await page.click('#addRuleBtn');
        await page.waitForTimeout(100);

        const rulesList = page.locator('#rulesList');
        await expect(rulesList.locator('.rule-item')).toHaveCount(0);
        expect(dialogMessage).toMatch(/same/i);
    });
});
