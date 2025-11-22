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

test.describe('URL Redirector Pause Functionality', () => {
    test.beforeEach(async ({ page }) => {
        // Inject the mock Chrome API before the page loads
        await page.addInitScript(mockChromeScript);

        // Navigate to the popup page
        await page.goto('/dist/popup.html');
    });

    test('should toggle rule pause state', async ({ page }) => {
        // Add a rule
        await page.fill('#sourceUrl', 'pause-test.com');
        await page.fill('#targetUrl', 'target.com');
        await page.click('#addRuleBtn');
        await page.waitForTimeout(100);

        // Verify rule exists and is active by default
        const ruleItem = page.locator('#rulesList .rule-item').first();
        await expect(ruleItem).not.toHaveClass(/paused/);

        const toggleBtn = ruleItem.locator('.toggle-btn');
        await expect(toggleBtn).toHaveText('Pause');
        await expect(toggleBtn).not.toHaveClass(/paused/);

        // Click pause
        await toggleBtn.click();
        await page.waitForTimeout(100);

        // Verify rule is paused
        await expect(ruleItem).toHaveClass(/paused/);
        await expect(toggleBtn).toHaveText('Resume');
        await expect(toggleBtn).toHaveClass(/paused/);

        // Click resume
        await toggleBtn.click();
        await page.waitForTimeout(100);

        // Verify rule is active again
        await expect(ruleItem).not.toHaveClass(/paused/);
        await expect(toggleBtn).toHaveText('Pause');
        await expect(toggleBtn).not.toHaveClass(/paused/);
    });

    test('should persist pause state after reload', async ({ page }) => {
        // Add a rule
        await page.fill('#sourceUrl', 'persist-pause.com');
        await page.fill('#targetUrl', 'target.com');
        await page.click('#addRuleBtn');
        await page.waitForTimeout(100);

        // Pause the rule
        const ruleItem = page.locator('#rulesList .rule-item').first();
        await ruleItem.locator('.toggle-btn').click();
        await page.waitForTimeout(100);

        // Reload page
        await page.reload();

        // Verify rule is still paused
        const reloadedRuleItem = page.locator('#rulesList .rule-item').first();
        await expect(reloadedRuleItem).toHaveClass(/paused/);
        await expect(reloadedRuleItem.locator('.toggle-btn')).toHaveText('Resume');
    });
});
