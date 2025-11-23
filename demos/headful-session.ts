import { chromium, Page, BrowserContext, Browser } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as repl from 'repl';

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

/**
 * Generates a human-readable timestamped filename for the recording
 */
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

/**
 * Injects a visual mouse cursor into the page to make Playwright's actions visible
 */
async function installMouseHelper(page: Page) {
    await page.addInitScript(() => {
        const install = () => {
            // Create the mouse cursor element
            const box = document.createElement('div');
            box.classList.add('playwright-mouse-cursor');

            const styleElement = document.createElement('style');
            styleElement.innerHTML = `
                .playwright-mouse-cursor {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(255, 255, 255, 0.9);
                    border-radius: 50%;
                    background: rgba(120, 0, 255, 0.5);
                    box-shadow: 0 0 10px rgba(120, 0, 255, 0.5);
                    pointer-events: none;
                    z-index: 2147483647;
                    transition: transform 0.1s, background 0.1s;
                    transform: translate(-50%, -50%);
                    display: none;
                }
                .playwright-mouse-cursor.active {
                    background: rgba(120, 0, 255, 0.9);
                    box-shadow: 0 0 15px rgba(120, 0, 255, 0.8);
                    transform: translate(-50%, -50%) scale(0.8);
                }
            `;

            document.head.appendChild(styleElement);
            document.body.appendChild(box);

            document.addEventListener('mousemove', event => {
                box.style.display = 'block';
                box.style.left = event.clientX + 'px';
                box.style.top = event.clientY + 'px';
            });

            document.addEventListener('mousedown', () => {
                box.classList.add('active');
            });

            document.addEventListener('mouseup', () => {
                box.classList.remove('active');
            });
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', install);
        } else {
            install();
        }
    });
}

/**
 * Injects a fake browser address bar (Chrome-style) into the page
 */
async function installBrowserChrome(page: Page) {
    await page.addInitScript(() => {
        if (window !== window.top) return; // Only run in top frame

        const install = () => {
            if (document.getElementById('playwright-browser-chrome')) return;

            const chromeHeight = 50;

            // Create container
            const chrome = document.createElement('div');
            chrome.id = 'playwright-browser-chrome';
            chrome.innerHTML = `
                <div class="chrome-controls">
                    <span class="chrome-btn">←</span>
                    <span class="chrome-btn">→</span>
                    <span class="chrome-btn">↻</span>
                </div>
                <div class="chrome-address-bar">
                    <span class="chrome-lock">🔒</span>
                    <input type="text" readonly value="${window.location.href}" />
                </div>
                <div class="chrome-menu">⋮</div>
            `;

            // Styles
            const style = document.createElement('style');
            style.innerHTML = `
                #playwright-browser-chrome {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: ${chromeHeight}px;
                    background: #f0f0f0;
                    border-bottom: 1px solid #ccc;
                    display: flex;
                    align-items: center;
                    padding: 0 10px;
                    box-sizing: border-box;
                    z-index: 2147483646; /* Just below cursor */
                    font-family: system-ui, -apple-system, sans-serif;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                }
                .chrome-controls {
                    display: flex;
                    gap: 15px;
                    margin-right: 15px;
                    color: #5f6368;
                    font-size: 18px;
                    user-select: none;
                }
                .chrome-address-bar {
                    flex: 1;
                    background: #fff;
                    border-radius: 20px;
                    height: 34px;
                    display: flex;
                    align-items: center;
                    padding: 0 15px;
                    font-size: 14px;
                    color: #202124;
                    border: 1px solid #dfdfdf;
                }
                .chrome-lock {
                    margin-right: 8px;
                    font-size: 12px;
                }
                .chrome-address-bar input {
                    border: none;
                    outline: none;
                    width: 100%;
                    color: inherit;
                    background: transparent;
                    font-family: inherit;
                }
                .chrome-menu {
                    margin-left: 15px;
                    color: #5f6368;
                    font-size: 18px;
                }
                /* Push content down */
                html {
                    margin-top: ${chromeHeight}px !important;
                }
                /* Fix fixed elements if possible (best effort) */
                body > header, body > nav, .fixed-top {
                    top: ${chromeHeight}px !important;
                }
            `;

            document.head.appendChild(style);
            document.body.appendChild(chrome);

            // Update URL logic
            const updateUrl = () => {
                const input = chrome.querySelector('input');
                if (input) input.value = window.location.href;
            };

            // Listen for SPA navigation
            const pushState = history.pushState;
            history.pushState = (...args) => {
                pushState.apply(history, args);
                updateUrl();
            };

            const replaceState = history.replaceState;
            history.replaceState = (...args) => {
                replaceState.apply(history, args);
                updateUrl();
            };

            window.addEventListener('popstate', updateUrl);
            window.addEventListener('hashchange', updateUrl);
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', install);
        } else {
            install();
        }
    });
}

/**
 * Example automation function - customize this with your own actions!
 */
async function performAutomation(page: Page) {
    console.log('\n🤖 Starting automated actions...\n');

    // Example 1: Navigate to a website
    console.log('📍 Navigating to Google...');
    await page.goto('https://www.google.com');
    await page.waitForLoadState('networkidle');

    // Example 2: Type in a search box
    console.log('⌨️  Typing in search box...');
    const searchBox = page.locator('textarea[name="q"]');
    await searchBox.fill('Playwright automation');

    // Example 3: Click a button
    console.log('🖱️  Clicking search button...');
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');

    // Example 4: Wait and take a screenshot
    console.log('📸 Taking screenshot...');
    await page.screenshot({ path: 'screenshot.png' });

    // Example 5: Navigate to another page
    console.log('📍 Navigating to TestUFO...');
    await page.goto('https://testufo.com/');
    await page.waitForLoadState('networkidle');

    // Example 6: Get page title
    const title = await page.title();
    console.log(`📄 Page title: "${title}"`);

    // Example 7: Evaluate JavaScript in the page
    const userAgent = await page.evaluate(() => navigator.userAgent);
    console.log(`🌐 User Agent: ${userAgent.substring(0, 50)}...`);

    console.log('\n✅ Automated actions completed!\n');
}

/**
 * Interactive mode - keeps browser open for manual interaction
 */
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

    // Create recordings directory if it doesn't exist
    const recordingsDir = path.join(__dirname, 'recordings');
    if (!fs.existsSync(recordingsDir)) {
        fs.mkdirSync(recordingsDir, { recursive: true });
        console.log('📁 Created recordings directory\n');
    }

    // Generate timestamped filename for this session
    const recordingFilename = generateRecordingFilename();

    // Check for HQ flag (or default to 1080p if user prefers)
    const isHQ = process.argv.includes('--hq');
    const width = isHQ ? 1920 : 1280;
    const height = isHQ ? 1080 : 720;

    if (isHQ) {
        console.log('🌟 HQ Mode Enabled: Recording at 1080p');
    } else {
        console.log('ℹ️  Standard Mode: Recording at 720p (Pass --hq for 1080p)');
    }

    console.log(`🎥 Recording will be saved to: ${recordingFilename}.webm\n`);

    // Launch browser in headful mode with a visible window
    // We use a persistent context to ensure window size args are respected
    // but clean it up to avoid "restore session" bubbles
    const userDataDir = '/tmp/playwright-demo-user-data';
    if (fs.existsSync(userDataDir)) {
        fs.rmSync(userDataDir, { recursive: true, force: true });
    }

    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        slowMo: 100,
        viewport: null, // Let window size control viewport
        // recordVideo: {               <-- DISABLED to improve performance
        //     dir: recordingsDir,
        //     size: { width, height }
        // },
        ignoreDefaultArgs: ['--enable-automation'], // Suppress "controlled by automation" banner
        args: [
            '--no-sandbox',          // Required for your environment
            '--test-type',           // Suppresses the "Stability" banner caused by no-sandbox
            '--no-default-browser-check',
            '--suppress-message-center-popups',

            // Aggressive anti-throttling
            // '--disable-background-timer-throttling',
            // '--disable-backgrounding-occluded-windows',
            // '--disable-renderer-backgrounding',
            // '--disable-ipc-flooding-protection',
            // '--disable-hang-monitor',

            // // Graphics & Performance
            // '--disable-gpu-vsync',                 // Unlock frame rate
            // '--disable-dev-shm-usage',             // Use disk instead of shared memory (prevents crashes/stalls)
            // '--enable-accelerated-2d-canvas',      // Force GPU acceleration
            // '--enable-gpu-rasterization',          // Force GPU rasterization

            // Window - Add padding for browser UI (approx 120px height for tabs/address bar, 20px width for borders)
            `--window-size=${width + 20},${height + 120}`,
            '--window-position=3840,0'
        ]
    });

    console.log('✅ Browser launched successfully!\n');

    // Create a new page (PersistentContext comes with one page by default, but we can create a new one or use pages()[0])
    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    // Install the visual mouse helper
    await installMouseHelper(page);
    console.log('🐭 Visual mouse helper installed');

    // Install the fake browser chrome (address bar)
    await installBrowserChrome(page);
    console.log('🎩 Virtual browser chrome installed');

    // Cleanup function to save video
    let cleanupCalled = false;
    const cleanup = async () => {
        if (cleanupCalled) return;
        cleanupCalled = true;

        console.log('\n\n🎬 Finalizing recording...');

        try {
            // Get the video object (might be null if recording is disabled)
            const video = page.video();

            // Close page and context
            try { await page.close(); } catch (e) { /* ignore */ }
            try { await context.close(); } catch (e) { /* ignore */ }

            if (video) {
                // Get the temporary path of the video
                const videoPath = await video.path().catch(() => null);

                if (videoPath) {
                    // Define the target path with our custom filename
                    const targetPath = path.join(recordingsDir, `${recordingFilename}.webm`);

                    // Check if file exists and rename it
                    if (fs.existsSync(videoPath)) {
                        fs.renameSync(videoPath, targetPath);
                        console.log(`✅ Recording saved: scripts/demos/recordings/${recordingFilename}.webm`);
                    } else {
                        console.log(`⚠️  Video file not found at: ${videoPath}`);
                    }
                } else {
                    console.log('⚠️  Could not retrieve video path');
                }
            } else {
                console.log('ℹ️  Internal recording disabled (using external recorder).');
            }
        } catch (error) {
            console.error('⚠️  Error during cleanup:', error);
        }

        process.exit(0);
    };

    // Handle signals
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    try {



        if (process.argv.includes('--interactive')) {
            await interactiveMode(page, context, context.browser()!);
        } else {
            // ============================================================
            // CUSTOMIZE THIS SECTION WITH YOUR OWN AUTOMATION!
            // ============================================================

            // Perform automated actions
            await performAutomation(page);

            // ============================================================
            // After automation, keep browser open for manual interaction
            // ============================================================
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
