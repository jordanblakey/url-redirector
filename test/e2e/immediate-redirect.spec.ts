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

test.describe('Immediate Redirect on Rule Change', () => {
    test.beforeEach(async ({ page }) => {
        // Inject the mock Chrome API
        await page.addInitScript(mockChromeScript);

        // Navigate to popup to have a context
        await page.goto('/dist/html/popup.html');

        // Load background script
        await page.addScriptTag({ url: '/dist/background.js', type: 'module' });
        await page.waitForTimeout(500);
    });

    test('should immediately redirect tabs when a matching rule is added', async ({ page }) => {
        // We know mock-chrome returns a tab with url 'https://reddit.com/r/test' (id: 2)

        // Setup a spy on chrome.tabs.update
        await page.evaluate(() => {
            (window as any).updateCalls = [];
            // @ts-ignore
            const originalUpdate = chrome.tabs.update;
            // @ts-ignore
            chrome.tabs.update = (tabId, props, callback) => {
                (window as any).updateCalls.push({ tabId, props });
                if (originalUpdate) originalUpdate(tabId, props, callback);
            };
        });

        // Add a rule that matches the existing tab
        await page.evaluate(() => {
            const rules = [{
                source: 'reddit.com',
                target: 'google.com',
                active: true,
                count: 0,
                id: 123
            }];
            // @ts-ignore
            chrome.storage.local.set({ rules });
        });

        // Verify redirection happens
        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).updateCalls);
        }).toEqual(expect.arrayContaining([
            expect.objectContaining({
                tabId: 2,
                props: { url: 'https://google.com' }
            })
        ]));
    });

    test('should immediately redirect tabs when a matching rule is resumed', async ({ page }) => {
        // Start with a paused rule
        await page.evaluate(() => {
            const rules = [{
                source: 'reddit.com',
                target: 'google.com',
                active: false,
                count: 0,
                id: 123
            }];
            // @ts-ignore
            chrome.storage.local.set({ rules });
        });

        // Setup spy
        await page.evaluate(() => {
            (window as any).updateCalls = [];
            // @ts-ignore
            const originalUpdate = chrome.tabs.update;
            // @ts-ignore
            chrome.tabs.update = (tabId, props, callback) => {
                (window as any).updateCalls.push({ tabId, props });
                if (originalUpdate) originalUpdate(tabId, props, callback);
            };
        });

        // Resume the rule
        await page.evaluate(() => {
            const rules = [{
                source: 'reddit.com',
                target: 'google.com',
                active: true,
                count: 0,
                id: 123
            }];
            // @ts-ignore
            chrome.storage.local.set({ rules });
        });

        // Verify redirection happens
        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).updateCalls);
        }).toEqual(expect.arrayContaining([
            expect.objectContaining({
                tabId: 2,
                props: { url: 'https://google.com' }
            })
        ]));
    });
});
