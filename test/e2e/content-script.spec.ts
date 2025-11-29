import { test, expect } from '../fixtures';
import { getServiceWorker } from '../fixtures';

test.describe('Content Script', () => {
  test('should remove url_redirector param', async ({ page, httpServer }) => {
    const testSource = 'e2e_test_source';
    const initialUrl = `${httpServer}/?param1=value1&url_redirector=${testSource}&param2=value2`;
    const expectedUrl = `${httpServer}/?param1=value1&param2=value2`;

    await page.goto(initialUrl);

    // 1. Verify URL cleanup
    await expect(page).toHaveURL(expectedUrl);
  });

  test('should not modify URL if url_redirector param is not present', async ({
    page,
    httpServer,
  }) => {
    const initialUrl = `${httpServer}/?param1=value1&param2=value2`;

    await page.goto(initialUrl);

    // 1. Verify URL remains unchanged
    await expect(page).toHaveURL(initialUrl);
  });
});
