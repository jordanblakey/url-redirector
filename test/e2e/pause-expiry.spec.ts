import { test, expect, getServiceWorker } from '../fixtures';

test.describe('Pause Expiry', () => {
  test('should immediately redirect when pause expires', async ({ context }) => {
    const worker = await getServiceWorker(context);
    const now = Date.now();
    const pauseDuration = 3000; // 3 seconds

    // Add a rule that is paused for 3 seconds
    await worker.evaluate(
      async ({ now, pauseDuration }) => {
        const rules = [
          {
            source: 'example.com',
            target: 'google.com',
            active: true,
            count: 0,
            id: 1,
            pausedUntil: now + pauseDuration,
          },
        ];
        await (self as any).storage.saveRules(rules);
      },
      { now, pauseDuration },
    );

    // Open a tab to the source URL
    const page = await context.newPage();

    // Mock the page to avoid network errors
    await page.route('https://example.com/', async (route) => {
      await route.fulfill({ status: 200, body: 'Source Page' });
    });

    await page.goto('https://example.com/');

    // Should not redirect initially (paused)
    await expect(page).toHaveURL(/example\.com/);

    // Wait for pause to expire and redirect to happen
    await expect
      .poll(async () => page.url(), {
        timeout: pauseDuration + 5000, // Wait for pause duration + buffer
        intervals: [500],
      })
      .toMatch(/google\.com/);
  });
});
