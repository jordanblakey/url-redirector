import { Page } from '@playwright/test';

// Example automation function - customize this with your own actions!
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
    await page.screenshot({ path: 'demos/screenshots/screenshot.png' });

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

export default performAutomation;
