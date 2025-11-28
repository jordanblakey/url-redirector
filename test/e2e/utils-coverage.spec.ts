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


            const page = await context.newPage();

            await page.route('https://http-test.com/', async route => {
                await route.fulfill({ status: 200, body: 'Source Page' });
            });

            await page.goto('https://http-test.com/');
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


            const page = await context.newPage();

            await page.route('https://www.www-test.com/', async route => {
                await route.fulfill({ status: 200, body: 'Source Page' });
            });

            await page.goto('https://www.www-test.com/');
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


            const page = await context.newPage();

            // Mock source and target
            await page.route('https://protocol-test.com/', async route => {
                await route.fulfill({ status: 200, body: 'Source Page' });
            });
            await page.route('https://example.com/', async route => {
                await route.fulfill({ status: 200, body: 'Target Page' });
            });

            await page.goto('https://protocol-test.com/');
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


            const page = await context.newPage();

            await page.route('https://shuffle-test.com/', async route => {
                await route.fulfill({ status: 200, body: 'Source Page' });
            });

            await page.goto('https://shuffle-test.com/');

            // Should redirect to some productive URL (not shuffle-test.com)
            // Wait for redirect to happen
            // await page.waitForTimeout(2000); // Removed: goto waits for load
            const url = new URL(page.url());
            expect(url.hostname).not.toContain('shuffle-test.com');
            expect(url.protocol).toMatch(/^https?:/);
            expect(url.searchParams.has('url_redirector')).toBe(false);

            const firstTarget = url.toString();

            // Give the background script time to update the DNR rules
            // We rely on the retry loop for this

            // Visit again to ensure we get a DIFFERENT target (re-roll)
            // We try up to 3 times to avoid flakiness from random collisions
            let different = false;
            for (let i = 0; i < 3; i++) {
                await page.goto('https://shuffle-test.com/');
                // await page.waitForTimeout(2000); // Removed: goto waits for load
                const nextUrl = new URL(page.url());
                const nextTarget = nextUrl.toString();

                if (nextTarget !== firstTarget) {
                    different = true;
                    break;
                }
                // Wait a bit before next try
                await new Promise(r => setTimeout(r, 500)); // Reduced wait
            }

            expect(different).toBe(true);
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


            const page = await context.newPage();

            await page.route('https://path-test.com/some/path', async route => {
                await route.fulfill({ status: 200, body: 'Source Page' });
            });

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
