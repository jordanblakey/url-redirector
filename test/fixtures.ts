import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// This is a workaround for a bug in Playwright where the userDataDir is not cleaned up
// https://github.com/microsoft/playwright/issues/14189
const userDataDirs: string[] = [];

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, use) => {
    const userDataDir = `/tmp/playwright-user-data-${Math.random()}`;
    userDataDirs.push(userDataDir);
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      slowMo: 100,
      viewport: null,
      ignoreDefaultArgs: ['--enable-automation'],
      args: [
          '--no-sandbox',
          '--test-type',
          '--no-default-browser-check',
          '--suppress-message-center-popups',
          '--window-size=1920,1080',
          '--window-position=3840,0',
          `--disable-extensions-except=${path.resolve(__dirname, '../dist')}`,
          `--load-extension=${path.resolve(__dirname, '../dist')}`,
      ]
    });
    await use(context);
    await context.close();
    // Clean up the user data dir
    fs.rmSync(userDataDir, { recursive: true, force: true });
  },
  extensionId: async ({ context }, use) => {
    let background: { url(): string; };
    if (context.serviceWorkers().length > 0) {
        background = context.serviceWorkers()[0];
    } else {
        background = await context.waitForEvent('serviceworker');
    }
    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  },
});

export const expect = test.expect;

// Cleanup all user data dirs
process.on('exit', () => {
  for (const dir of userDataDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
