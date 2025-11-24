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

test.describe('Badge Functionality', () => {
    test.beforeEach(async ({ page }) => {
        // Inject the mock Chrome API
        await page.addInitScript(mockChromeScript);

        // Navigate to a page to provide a context (we use popup.html but it could be blank)
        // We need a page that can load modules from dist/
        await page.goto('/dist/html/popup.html');
    });

    test('should show badge on redirection', async ({ page }) => {
        // 1. Load the background script logic
        // We load it as a module so it can resolve imports
        await page.addScriptTag({ url: '/dist/background.js', type: 'module' });

        // Wait for script to initialize and register listeners
        await page.waitForTimeout(500);

        // 2. Set up a redirection rule in the mock storage
        await page.evaluate(() => {
            const rules = [{
                source: 'reddit.com',
                target: 'google.com',
                active: true,
                count: 0
            }];
            // @ts-ignore
            chrome.storage.local.set({ rules });
        });

        // 3. Trigger the onBeforeNavigate event via the mock
        await page.evaluate(() => {
            // @ts-ignore
            chrome.webNavigation.onBeforeNavigate.dispatch({
                frameId: 0,
                tabId: 1,
                url: 'https://reddit.com/r/something'
            });
        });

        // 4. Verify the badge text was set
        // The background script sets the badge asynchronously (inside storage callback)
        // so we might need to wait/poll
        await expect.poll(async () => {
            return await page.evaluate(() => {
                // @ts-ignore
                return chrome.action.getLastBadgeText();
            });
        }).toBe('1');
    });

    test('should show correct count on badge', async ({ page }) => {
        // 1. Load the background script logic
        await page.addScriptTag({ url: '/dist/background.js', type: 'module' });

        // Wait for script to initialize
        await page.waitForTimeout(500);

        // 2. Set up a redirection rule with existing count
        await page.evaluate(() => {
            const rules = [{
                source: 'facebook.com',
                target: 'google.com',
                active: true,
                count: 42
            }];
            // @ts-ignore
            chrome.storage.local.set({ rules });
        });

        // 3. Trigger the onBeforeNavigate event
        await page.evaluate(() => {
            // @ts-ignore
            chrome.webNavigation.onBeforeNavigate.dispatch({
                frameId: 0,
                tabId: 1,
                url: 'https://facebook.com/feed'
            });
        });

        // 4. Verify the badge text shows incremented count (42 + 1 = 43)
        await expect.poll(async () => {
            return await page.evaluate(() => {
                // @ts-ignore
                return chrome.action.getLastBadgeText();
            });
        }).toBe('43');
    });

    test('should not show badge if rule is inactive', async ({ page }) => {
        await page.addScriptTag({ url: '/dist/background.js', type: 'module' });
        await page.waitForTimeout(500);

        await page.evaluate(() => {
            const rules = [{
                source: 'reddit.com',
                target: 'google.com',
                active: false, // Inactive rule
                count: 0
            }];
            // @ts-ignore
            chrome.storage.local.set({ rules });
        });

        await page.evaluate(() => {
            // @ts-ignore
            chrome.webNavigation.onBeforeNavigate.dispatch({
                frameId: 0,
                tabId: 1,
                url: 'https://reddit.com/r/something'
            });
        });

        // Wait a bit to ensure it didn't happen
        await page.waitForTimeout(200);

        const badgeText = await page.evaluate(() => {
            // @ts-ignore
            return chrome.action.getLastBadgeText();
        });

        expect(badgeText).toBe('');
    });
});
