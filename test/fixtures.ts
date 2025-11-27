import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import { addCoverageReport } from 'monocart-reporter';
import path from 'path';
import fs from 'fs';

const userDataDirs: string[] = [];

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
  autoCoverage: void;
}>({
  context: async ({ }, use) => {
    const userDataDir = `/tmp/playwright-user-data-${Math.random()}`;
    userDataDirs.push(userDataDir);
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
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
    fs.rmSync(userDataDir, { recursive: true, force: true });
  },

  autoCoverage: [async ({ context }, use) => {
    // 1. Coverage Collection Logic
    const startCoverage = async (page: Page) => {
      if (page.isClosed()) return;
      try {
        await Promise.all([
          page.coverage.startJSCoverage({ resetOnNavigation: false }),
          page.coverage.startCSSCoverage({ resetOnNavigation: false }),
        ]);
      } catch (e) { /* ignore */ }
    };

    for (const page of context.pages()) await startCoverage(page);
    context.on('page', startCoverage);

    await use();

    // 2. Stop Collection
    const coverageList: any[] = [];
    for (const page of context.pages()) {
      if (page.isClosed()) continue;
      try {
        const [jsCoverage, cssCoverage] = await Promise.all([
          page.coverage.stopJSCoverage(),
          page.coverage.stopCSSCoverage()
        ]);
        coverageList.push(...jsCoverage, ...cssCoverage);
      } catch (e) { /* ignore */ }
    }

    const distDir = path.resolve(__dirname, '../dist');

    const calibratedList = coverageList.map(entry => {
      // Check if this is actually an extension file
      if (entry.url.startsWith('chrome-extension://')) {
        const relativePath = entry.url.replace(/^chrome-extension:\/\/.*?\//, '');
        const localPath = path.join(distDir, relativePath);

        return {
          ...entry,
          url: localPath
        };
      }

      // Return external URLs (http/https) as-is
      // The entryFilter in your config will catch and exclude these later
      return entry;
    });

    // 4. Send clean data to reporter
    await addCoverageReport(calibratedList, test.info());

  }, { scope: 'test', auto: true }],

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

process.on('exit', () => {
  for (const dir of userDataDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});