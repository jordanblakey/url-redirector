import { test, expect, getServiceWorker } from '../fixtures';

test.describe('Utils Coverage - E2E', () => {
    test.describe('URL Matching and Redirection', () => {
        test('should handle protocol normalization (http vs https)', async ({ context }) => {
            const worker = await getServiceWorker(context);

            await worker.evaluate(async () => {
                const rules = [{
                    source: 'http-test.com',
                    target: 'google.com',
                    active: true,
                    count: 0,
                    id: 200
                }];
                await chrome.storage.local.set({ rules });
            });

            // Wait for background script to process rule changes
            await new Promise(r => setTimeout(r, 500));

            const page = await context.newPage();
            await page.goto('https://http-test.com');
            await expect(page).toHaveURL(/google\.com/);
        });

        test('should handle www normalization', async ({ context }) => {
            const worker = await getServiceWorker(context);

            await worker.evaluate(async () => {
                const rules = [{
                    source: 'www-test.com',
                    target: 'google.com',
                    active: true,
                    count: 0,
                    id: 201
                }];
                await chrome.storage.local.set({ rules });
            });

            // Wait for background script to process rule changes
            await new Promise(r => setTimeout(r, 500));

            const page = await context.newPage();
            await page.goto('https://www.www-test.com');
            await expect(page).toHaveURL(/google\.com/);
        });

        test('should add https protocol to target if missing', async ({ context }) => {
            const worker = await getServiceWorker(context);

            await worker.evaluate(async () => {
                const rules = [{
                    source: 'protocol-test.com',
                    target: 'example.com', // No protocol
                    active: true,
                    count: 0,
                    id: 202
                }];
                await chrome.storage.local.set({ rules });
            });

            // Wait for background script to process rule changes
            await new Promise(r => setTimeout(r, 500));

            const page = await context.newPage();
            await page.goto('https://protocol-test.com');
            await expect(page).toHaveURL(/https:\/\/example\.com/);
        });

        test('should handle shuffle target', async ({ context }) => {
            const worker = await getServiceWorker(context);

            await worker.evaluate(async () => {
                const rules = [{
                    source: 'shuffle-test.com',
                    target: ':shuffle:',
                    active: true,
                    count: 0,
                    id: 203
                }];
                await chrome.storage.local.set({ rules });
            });

            // Wait for background script to process rule changes
            await new Promise(r => setTimeout(r, 500));

            const page = await context.newPage();
            await page.goto('https://shuffle-test.com');

            // Should redirect to some productive URL (not shuffle-test.com)
            // Wait for redirect to happen
            await page.waitForTimeout(2000);
            const url = page.url();
            expect(url).not.toContain('shuffle-test.com');
            expect(url).toMatch(/^https?:\/\//);
        });

        test('should match URL with path', async ({ context }) => {
            const worker = await getServiceWorker(context);

            await worker.evaluate(async () => {
                const rules = [{
                    source: 'path-test.com',
                    target: 'google.com',
                    active: true,
                    count: 0,
                    id: 207
                }];
                await chrome.storage.local.set({ rules });
            });

            // Wait for background script to process rule changes
            await new Promise(r => setTimeout(r, 500));

            const page = await context.newPage();
            await page.goto('https://path-test.com/some/path');

            // Should redirect even with path
            await expect(page).toHaveURL(/google\.com/);
        });
    });

    test.describe('URL Validation', () => {
        test('should reject invalid URL in popup', async ({ page, extensionId }) => {
            await page.goto(`chrome-extension://${extensionId}/html/popup.html`);

            await page.fill('#sourceUrl', 'not a valid url!!!');
            await page.fill('#targetUrl', 'google.com');
            await page.click('#addRuleBtn');

            // Should show validation error
            const flashMessage = page.locator('.flash-message');
            await expect(flashMessage).toBeVisible();
            await expect(flashMessage).toContainText('Invalid Source URL');
        });

        test('should reject invalid target URL in popup', async ({ page, extensionId }) => {
            await page.goto(`chrome-extension://${extensionId}/html/popup.html`);

            await page.fill('#sourceUrl', 'valid.com');
            await page.fill('#targetUrl', 'not valid!!!');
            await page.click('#addRuleBtn');

            // Should show validation error
            const flashMessage = page.locator('.flash-message');
            await expect(flashMessage).toBeVisible();
            await expect(flashMessage).toContainText('Invalid Target URL');
        });

        test('should accept valid domain without protocol', async ({ page, extensionId }) => {
            await page.goto(`chrome-extension://${extensionId}/html/popup.html`);

            await page.fill('#sourceUrl', 'valid-domain.com');
            await page.fill('#targetUrl', 'target-domain.com');
            await page.click('#addRuleBtn');

            // Should add successfully
            const rulesList = page.locator('#rulesList');
            await expect(rulesList.locator('.rule-item')).toHaveCount(1);
        });

        test('should accept valid URL with protocol', async ({ page, extensionId }) => {
            await page.goto(`chrome-extension://${extensionId}/html/popup.html`);

            await page.fill('#sourceUrl', 'https://protocol.com');
            await page.fill('#targetUrl', 'https://target.com');
            await page.click('#addRuleBtn');

            // Should add successfully
            const rulesList = page.locator('#rulesList');
            await expect(rulesList.locator('.rule-item')).toHaveCount(1);
        });
    });
});
