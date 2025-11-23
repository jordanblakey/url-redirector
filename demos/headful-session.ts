import { chromium } from 'playwright';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import * as fs from 'fs';
import installMouseHelper from './mouse-helper';
import performAutomation from './perform-automation';
import * as repl from 'repl';
import * as path from 'path';


/**
 * Opens a headful Playwright browser session with programmatic control.
 * 
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/headful-session.ts
 * 
 * This script demonstrates:
 * - Launching a visible Chrome browser (headful mode)
 * - Controlling the browser with code (navigation, clicking, typing, etc.)
 * - Keeping the browser open for manual interaction after automation
 */

const WIDTH = 3840;
const HEIGHT = 2160;

// Generates a human-readable timestamped filename for the recording
function generateRecordingFilename(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `headful-session_${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}


// Interactive mode - keeps browser open for manual interaction
async function interactiveMode(page: Page, context: BrowserContext, browser: Browser) {
    console.log('='.repeat(70));
    console.log('🎮 INTERACTIVE MODE - You can now control the browser!');
    console.log('='.repeat(70));
    console.log('\n💡 Tips:');
    console.log('  - The browser will stay open for manual interaction');
    console.log('  - You can modify this script to add more automated actions');
    console.log('  - Close the browser window to exit, or press Ctrl+C here');
    console.log('  - Your session is being recorded!');
    console.log('\n� REPL Enabled: Type Playwright commands here!');
    console.log('   e.g., await page.goto("https://google.com")');
    console.log('   Variables available: page, context, browser');
    console.log('='.repeat(70));
    console.log('');

    // Start REPL
    const r = repl.start({ prompt: '> ' });

    // Expose variables to REPL context
    r.context.page = page;
    r.context.context = context;
    r.context.browser = browser;

    // Keep the script running until REPL exits
    await new Promise<void>((resolve) => {
        r.on('exit', () => {
            resolve();
        });
    });
}

async function main() {
    console.log('🚀 Launching headful Playwright session...\n');

    // Launch browser in headful mode with a visible window
    // We use a persistent context to ensure window size args are respected
    // but clean it up to avoid "restore session" bubbles
    const userDataDir = '/tmp/playwright-demo-user-data';
    if (fs.existsSync(userDataDir)) {
        fs.rmSync(userDataDir, { recursive: true, force: true });
    }

    const pathToExtension = path.join(__dirname, '..', 'dist');

    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        slowMo: 100,
        viewport: null, // Let window size control viewport
        ignoreDefaultArgs: ['--enable-automation'], // Suppress "controlled by automation" banner
        args: [
            '--no-sandbox',          // Required for your environment
            '--test-type',           // Suppresses the "Stability" banner caused by no-sandbox
            '--no-default-browser-check',
            '--suppress-message-center-popups',
            `--window-size=${WIDTH},${HEIGHT}`,
            '--window-position=3840,0',
            `--disable-extensions-except=${pathToExtension}`,
            `--load-extension=${pathToExtension}`,
        ]
    });

    console.log('✅ Browser launched successfully!\n');

    // Create a new page (PersistentContext comes with one page by default, but we can create a new one or use pages()[0])
    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    // Install the visual mouse helper
    await installMouseHelper(page);
    console.log('🐭 Visual mouse helper installed');

    // Cleanup function to save video
    let cleanupCalled = false;
    const cleanup = async () => {
        if (cleanupCalled) return;
        cleanupCalled = true;

        process.exit(0);
    };

    // Handle signals
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    try {
        console.log('argv', process.argv);
        if (process.argv.includes('--interactive')) {
            await interactiveMode(page, context, context.browser()!);
        } else {
            await performAutomation(page);
        }
        console.log('\n✨ Automation finished. Exiting to save recording...');

    } catch (error) {
        console.error('❌ Error during execution:', error);
    } finally {
        await cleanup();
    }
}

// Run the main function
main().catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
});
