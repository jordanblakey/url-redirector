import { test, expect } from "../fixtures";
import { getServiceWorker } from "../fixtures";

test.describe("Content Script", () => {
    let backgroundWorker: any;

    test.beforeEach(async ({ context }) => {
        backgroundWorker = await getServiceWorker(context);
        // Inject a listener into the background worker to capture messages from content scripts
        await backgroundWorker.evaluate(() => {
            (self as any).receivedMessages = [];
            chrome.runtime.onMessage.addListener((message: any) => {
                (self as any).receivedMessages.push(message);
                return true; // Keep the message channel open for potential response
            });
        });
    });

    test.afterEach(async () => {
        // Clear captured messages after each test
        await backgroundWorker.evaluate(() => {
            (self as any).receivedMessages = [];
        });
    });

    test("should remove url_redirector param and send message if present", async ({ page, httpServer }) => {
        const testSource = "e2e_test_source";
        const initialUrl = `${httpServer}/?param1=value1&url_redirector=${testSource}&param2=value2`;
        const expectedUrl = `${httpServer}/?param1=value1&param2=value2`;

        await page.goto(initialUrl);

        // 1. Verify URL cleanup
        await expect(page).toHaveURL(expectedUrl);

        // 2. Verify message sent to background script
        // We need to wait for the message to be processed by the background script
        await page.waitForTimeout(100); // Small wait to allow async message to process

        const messages = await backgroundWorker.evaluate(() => (self as any).receivedMessages);

        expect(messages).toHaveLength(1);
        expect(messages[0]).toEqual({
            type: 'REDIRECT_DETECTED',
            source: testSource
        });
    });

    test("should not modify URL or send message if url_redirector param is not present", async ({ page, httpServer }) => {
        const initialUrl = `${httpServer}/?param1=value1&param2=value2`;

        await page.goto(initialUrl);

        // 1. Verify URL remains unchanged
        await expect(page).toHaveURL(initialUrl);

        // 2. Verify no message sent to background script
        await page.waitForTimeout(100); // Small wait to ensure no late messages

        const messages = await backgroundWorker.evaluate(() => (self as any).receivedMessages);

        expect(messages).toHaveLength(0);
    });
});
