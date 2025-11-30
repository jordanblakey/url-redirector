import {
  test as base,
  chromium,
  type BrowserContext,
  type Page,
  type Worker,
} from '@playwright/test';
import { addCoverageReport } from 'monocart-reporter';
import path from 'path';
import fs from 'fs';
import { Session } from 'inspector';
import { promisify } from 'util';
import * as http from 'http'; // Import http module
import { AddressInfo } from 'net';

const userDataDirs: string[] = [];

export async function getServiceWorker(context: BrowserContext): Promise<Worker> {
  let background: Worker | undefined = context.serviceWorkers()[0];
  if (!background) {
    // Poll for the service worker
    const startTime = Date.now();
    const timeout = 10000; // 10 seconds
    while (!background && Date.now() - startTime < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      background = context.serviceWorkers()[0];
    }

    if (!background) {
      throw new Error(
        `Service worker not found after ${timeout}ms. Available workers: ${context.serviceWorkers().length}`,
      );
    }
  }
  return background;
}

export const test = base.extend<
  {
    context: BrowserContext;
    extensionId: string;
    autoCoverage: void;
  },
  {
    httpServer: string;
  }
>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use, testInfo) => {
    // Check if this is a script test or unit test (Node.js only)
    if (testInfo.file.includes('test/scripts/') || testInfo.file.includes('test/unit/')) {
      await use(undefined as any);
      return;
    }

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
      ],
    });
    await context.addInitScript(() => {
      // No need to force local storage anymore
    });
    await use(context);
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  },

  autoCoverage: [
    async ({ context }, use, testInfo) => {
      // Only run coverage if the COVERAGE environment variable is set
      if (!process.env.COVERAGE) {
        await use();
        return;
      }

      // Check if we are running in a browser context (E2E tests)
      const isBrowserTest = context && typeof context.pages === 'function';

      // --- Browser Coverage Setup ---
      if (isBrowserTest) {
        const startCoverage = async (page: Page) => {
          if (page.isClosed()) return;
          try {
            await Promise.all([
              page.coverage.startJSCoverage({ resetOnNavigation: false }),
              page.coverage.startCSSCoverage({ resetOnNavigation: false }),
            ]);
          } catch (e) {
            /* ignore */
          }
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
              page.coverage.stopCSSCoverage(),
            ]);
            coverageList.push(...jsCoverage, ...cssCoverage);
          } catch (e) {
            /* ignore */
          }
        }

        const distDir = path.resolve(__dirname, '../dist');
        const calibratedList = coverageList.map((entry) => {
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
          const { result } = (await post('Profiler.takePreciseCoverage')) as any;
          await post('Profiler.stopPreciseCoverage');
          await post('Profiler.disable');

          const coverage = result;

          if (coverage) {
            const filtered = coverage
              .filter(
                (entry: any) =>
                  (entry.url.includes('/scripts/') || entry.url.includes('/src/')) &&
                  !entry.url.includes('node_modules') &&
                  !entry.url.includes('test/'),
              )
              .map((entry: any) => {
                let url = entry.url;
                if (url.startsWith('file://')) {
                  url = url.replace('file://', '');
                }

                // Make relative to project root
                url = path.relative(process.cwd(), url);

                let source;
                try {
                  // Read the source file content
                  const absolutePath = path.resolve(process.cwd(), url);
                  const rawSource = fs.readFileSync(absolutePath, 'utf-8');

                  // Transpile TS to JS, stripping types but keeping line numbers
                  // This fixes "Unparsable source" errors in monocart-reporter
                  // eslint-disable-next-line @typescript-eslint/no-require-imports
                  const babel = require('@babel/core');
                  const result = babel.transformSync(rawSource, {
                    presets: ['@babel/preset-typescript'],
                    retainLines: true,
                    compact: false,
                    filename: url,
                  });
                  source = result.code;
                } catch (e) {
                  console.warn('Failed to read/transpile source for', url);
                }

                return {
                  ...entry,
                  url,
                  source,
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
    },
    { scope: 'test', auto: true },
  ],

  extensionId: async ({ context }, use) => {
    const background = await getServiceWorker(context);
    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  },

  // New fixture for the HTTP server
  httpServer: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const testHtmlContent = `<!DOCTYPE html><html><head><title>Test Page</title></head><body><h1>Content Script Test</h1></body></html>`;
      const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(testHtmlContent);
      });

      let port = 0;
      await new Promise<void>((resolve) => {
        server.listen(0, () => {
          const address = server.address() as AddressInfo;
          port = address.port;
          resolve();
        });
      });

      const baseUrl = `http://localhost:${port}`;
      await use(baseUrl);

      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
    { scope: 'worker' },
  ], // scope: 'worker' ensures one server per worker
});

export const expect = test.expect;

process.on('exit', () => {
  for (const dir of userDataDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
