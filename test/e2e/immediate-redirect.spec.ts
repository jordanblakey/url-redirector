import { test, expect, getServiceWorker } from '../fixtures';

test.describe('Immediate Redirect on Rule Change', () => {
    test('should immediately redirect tabs when a matching rule is added', async ({ context }) => {
        const worker = await getServiceWorker(context);

        // Open a tab to the source URL
        const page = await context.newPage();
        await page.goto('https://example.com');

        // Add rule
        await worker.evaluate(async () => {
            const rules = [{
                source: 'example.com',
                target: 'google.com',
                active: true,
                count: 0,
                id: 123
            }];
            await chrome.storage.local.set({ rules });
        });

        // Verify redirect
        await expect(page).toHaveURL(/google\.com/);
    });

    test('should immediately redirect tabs when a rule is unpaused (pausedUntil removed)', async ({ context }) => {
        const worker = await getServiceWorker(context);
        const now = Date.now();

        // Start with a paused rule
        await worker.evaluate(async (timestamp) => {
            const rules = [{
                source: 'example.org',
                target: 'google.com',
                active: true,
                count: 0,
                id: 124,
                pausedUntil: timestamp + 100000 // Paused
            }];
            await chrome.storage.local.set({ rules });
        }, now);

        // Open a tab to the source URL
        const page = await context.newPage();
        await page.goto('https://example.org');

        // Ensure it stays on source (not redirected)
        await expect(page).toHaveURL(/example\.org/);

        // Unpause the rule
        await worker.evaluate(async () => {
            const rules = [{
                source: 'example.org',
                target: 'google.com',
                active: true,
                count: 0,
                id: 124,
                pausedUntil: undefined // Unpaused
            }];
            await chrome.storage.local.set({ rules });
        });

        // Verify redirect
        await expect(page).toHaveURL(/google\.com/);
    });

    test('should immediately redirect tabs when a matching rule is resumed', async ({ context }) => {
        const worker = await getServiceWorker(context);

        // Start with an inactive rule
        await worker.evaluate(async () => {
            const rules = [{
                source: 'example.net',
                target: 'google.com',
                active: false,
                count: 0,
                id: 125
            }];
            await chrome.storage.local.set({ rules });
        });

        // Open a tab to the source URL
        const page = await context.newPage();
        await page.goto('https://example.net');

        // Ensure it stays on source
        await expect(page).toHaveURL(/example\.net/);

        // Resume the rule
        await worker.evaluate(async () => {
            const rules = [{
                source: 'example.net',
                target: 'google.com',
                active: true,
                count: 0,
                id: 125
            }];
            await chrome.storage.local.set({ rules });
        });

        // Verify redirect
        await expect(page).toHaveURL(/google\.com/);
    });

    test('should redirect new tabs using DNR rules', async ({ context }) => {
        const worker = await getServiceWorker(context);

        // Add rule
        await worker.evaluate(async () => {
            const rules = [{
                source: 'example.edu',
                target: 'google.com',
                active: true,
                count: 0,
                id: 126
            }];
            await chrome.storage.local.set({ rules });
        });

        // Open a NEW tab to the source URL
        const page = await context.newPage();
        await page.goto('https://example.edu');

        // Verify redirect
        await expect(page).toHaveURL(/google\.com/);
    });
});
