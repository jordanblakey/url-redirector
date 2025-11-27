import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import { addCoverageReport } from 'monocart-reporter';
import path from 'path';
import fs from 'fs';
import { Session } from 'inspector';
import { promisify } from 'util';

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

  autoCoverage: [async ({ context }, use, testInfo) => {
    // Check if we are running in a browser context (E2E tests)
    const isBrowserTest = !!context;

    // --- Browser Coverage Setup ---
    if (isBrowserTest) {
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
    }

    // --- Node.js Coverage Setup (for Scripts) ---
    let session: Session | undefined;
    let post: any;

    if (!isBrowserTest) {
      session = new Session();
      session.connect();
      post = promisify(session.post).bind(session);

      try {
        await post('Profiler.enable');
        await post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
      } catch (e) {
        console.warn('Failed to start Node.js coverage:', e);
      }
    }

    await use();

    // --- Browser Coverage Collection ---
    if (isBrowserTest) {
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
        if (entry.url.startsWith('chrome-extension://')) {
          const relativePath = entry.url.replace(/^chrome-extension:\/\/.*?\//, '');
          const localPath = path.join(distDir, relativePath);
          return { ...entry, url: localPath };
        }
        return entry;
      });

      await addCoverageReport(calibratedList, testInfo);
    }

    // --- Node.js Coverage Collection ---
    if (!isBrowserTest && session && post) {
      try {
        const { result } = await post('Profiler.takePreciseCoverage') as any;
        await post('Profiler.stopPreciseCoverage');
        await post('Profiler.disable');

        const coverage = result;

        if (coverage) {
          const filtered = coverage.filter((entry: any) =>
            entry.url.includes('/scripts/') &&
            !entry.url.includes('node_modules') &&
            !entry.url.includes('test/')
          ).map((entry: any) => {
            let url = entry.url;
            if (url.startsWith('file://')) {
              url = url.replace('file://', '');
            }

            // Make relative to project root
            url = path.relative(process.cwd(), url);

            let source;
            try {
              source = fs.readFileSync(url, 'utf-8');
            } catch (e) {
              console.warn('Failed to read source for', url);
            }

            return {
              ...entry,
              url,
              source
            };
          });

          if (filtered.length > 0) {
            await addCoverageReport(filtered, testInfo);
          }
        }
      } catch (e) {
        console.warn('Failed to collect Node.js coverage:', e);
      } finally {
        session.disconnect();
      }
    }

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