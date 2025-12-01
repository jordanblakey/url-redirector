import { test, expect, getServiceWorker } from '../fixtures';
import { Rule } from '../../src/types';

test.describe('Rule Count Updates', () => {
  test('should increment rule count after redirect', async ({ context }) => {
    const worker = await getServiceWorker(context);
    await new Promise((resolve) => setTimeout(resolve, 500));

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
      await (self as any).storage.saveRules(rules);
    });

    // Open a tab to the source URL
    const page = await context.newPage();
    await page.goto('https://example.com');

    // Verify redirect
    await expect(page).toHaveURL(/google\.com/);

    // Wait for count update (it happens asynchronously in background)
    await expect
      .poll(
        async () => {
          return await worker.evaluate(async () => {
            const rules = await (self as any).storage.getRules();
            return rules.find((r: any) => r.id === 999)?.count;
          });
        },
        { timeout: 10000 },
      )
      .toBe(1);
  });

  test('should increment count for normalized matches', async ({ context }) => {
    const worker = await getServiceWorker(context);
    await new Promise((resolve) => setTimeout(resolve, 500));

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
      await (self as any).storage.saveRules(rules);
    });

    // Open a tab to the source URL with different casing/protocol
    const page = await context.newPage();
    await page.goto('https://www.example.org');

    // Verify redirect
    await expect(page).toHaveURL(/google\.com/);

    // Verify count incremented despite casing/protocol differences
    await expect
      .poll(
        async () => {
          return await worker.evaluate(async () => {
            const rules = await (self as any).storage.getRules();
            return rules.find((r: any) => r.id === 1000)?.count;
          });
        },
        { timeout: 10000 },
      )
      .toBe(1);
  });

  test('should increment counts for transitive redirects', async ({ context }) => {
    const worker = await getServiceWorker(context);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Add rules: a.com -> b.com -> c.com
    await worker.evaluate(async () => {
      const rules: Rule[] = [
        { id: 1001, source: 'a.com', target: 'b.com', active: true, count: 0 },
        { id: 1002, source: 'b.com', target: 'c.com', active: true, count: 0 },
        { id: 1003, source: 'c.com', target: 'd.com', active: true, count: 0 },
      ];
      await (self as any).storage.saveRules(rules);
    });

    // Open a tab to the source URL
    const page = await context.newPage();

    // Mock network requests to avoid DNS errors
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (['a.com', 'b.com', 'c.com', 'd.com'].some((d) => url.includes(d))) {
        return route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `<html><body>Mock for ${url}</body></html>`,
        });
      }
      return route.continue();
    });

    await page.goto('https://a.com');

    // Verify redirect
    await expect(page).toHaveURL(/d\.com/);

    // Verify all rule counts incremented
    await expect
      .poll(
        async () => {
          const rules = await worker.evaluate(async () => {
            return await (self as any).storage.getRules();
          });
          const rule1 = rules.find((r: any) => r.id === 1001);
          const rule2 = rules.find((r: any) => r.id === 1002);
          const rule3 = rules.find((r: any) => r.id === 1003);
          return rule1?.count === 1 && rule2?.count === 1 && rule3?.count === 1;
        },
        { timeout: 10000 },
      )
      .toBe(true);
  });
});
