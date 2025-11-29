import { test, expect, getServiceWorker } from '../fixtures';
import { Rule } from '../../src/types';

test.describe('Rule Count Updates', () => {
  test('should increment rule count after redirect', async ({ context }) => {
    const worker = await getServiceWorker(context);

    // Add rule
    await worker.evaluate(async () => {
      const rules = [
        {
          source: 'example.com',
          target: 'google.com',
          active: true,
          count: 0,
          id: 999,
        },
      ];
      await chrome.storage.sync.set({ rules });
    });

    // Open a tab to the source URL
    const page = await context.newPage();
    await page.goto('https://example.com');

    // Verify redirect
    await expect(page).toHaveURL(/google\.com/);

    // Wait for count update (it happens asynchronously in background)
    await expect
      .poll(async () => {
        return await worker.evaluate(async () => {
          const { rules } = (await chrome.storage.sync.get('rules')) as { rules: any[] };
          return rules.find((r: any) => r.id === 999)?.count;
        });
      })
      .toBe(1);
  });

  test('should increment count for normalized matches', async ({ context }) => {
    const worker = await getServiceWorker(context);

    // Add rule with specific casing/protocol
    await worker.evaluate(async () => {
      const rules = [
        {
          source: 'Example.ORG',
          target: 'google.com',
          active: true,
          count: 0,
          id: 1000,
        },
      ];
      await chrome.storage.sync.set({ rules });
    });

    // Open a tab to the source URL with different casing/protocol
    const page = await context.newPage();
    await page.goto('https://www.example.org');

    // Verify redirect
    await expect(page).toHaveURL(/google\.com/);

    // Verify count incremented despite casing/protocol differences
    await expect
      .poll(async () => {
        return await worker.evaluate(async () => {
          const { rules } = (await chrome.storage.sync.get('rules')) as { rules: any[] };
          return rules.find((r: any) => r.id === 1000)?.count;
        });
      })
      .toBe(1);
  });
});
