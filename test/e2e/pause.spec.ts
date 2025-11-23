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
        await page.goto('/dist/html/popup.html');
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

        // Hover to reveal buttons
        await ruleItem.hover();

        const toggleBtn = ruleItem.locator('.toggle-btn');
        await expect(toggleBtn).toHaveAttribute('title', 'Pause Rule');
        await expect(toggleBtn).not.toHaveClass(/paused/);

        // Click pause
        await toggleBtn.click();
        await page.waitForTimeout(100);

        // Hover again
        await ruleItem.hover();

        // Verify rule is paused
        await expect(ruleItem).toHaveClass(/paused/);
        await expect(toggleBtn).toHaveAttribute('title', 'Resume Rule');
        await expect(toggleBtn).toHaveClass(/paused/);

        // Click resume
        await toggleBtn.click();
        await page.waitForTimeout(100);

        // Hover again
        await ruleItem.hover();

        // Verify rule is active again
        await expect(ruleItem).not.toHaveClass(/paused/);
        await expect(toggleBtn).toHaveAttribute('title', 'Pause Rule');
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
        await ruleItem.hover();
        await ruleItem.locator('.toggle-btn').click();
        await page.waitForTimeout(100);

        // Reload page
        await page.reload();

        // Verify rule is still paused
        const reloadedRuleItem = page.locator('#rulesList .rule-item').first();
        await reloadedRuleItem.hover();
        await expect(reloadedRuleItem).toHaveClass(/paused/);
        await expect(reloadedRuleItem.locator('.toggle-btn')).toHaveAttribute('title', 'Resume Rule');
    });
});
