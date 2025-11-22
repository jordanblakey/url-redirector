import { test as testBase, expect } from '@playwright/test';
import { addCoverageReport } from 'monocart-reporter';

export const test = testBase.extend({
    autoTestFixture: [async ({ page }, use) => {

        // Start V8 coverage
        // Coverage API is usually chromium only
        const isChromium = testBase.info().project.name === 'chromium' || testBase.info().project.name === 'Desktop Chrome' || !testBase.info().project.name;

        if (isChromium) {
            await Promise.all([
                page.coverage.startJSCoverage({
                    resetOnNavigation: false
                }),
                page.coverage.startCSSCoverage({
                    resetOnNavigation: false
                })
            ]);
        }

        await use('autoTestFixture');

        if (isChromium) {
            const [jsCoverage, cssCoverage] = await Promise.all([
                page.coverage.stopJSCoverage(),
                page.coverage.stopCSSCoverage()
            ]);
            const coverageList = [...jsCoverage, ...cssCoverage];
            await addCoverageReport(coverageList, testBase.info());
        }

    }, {
        scope: 'test',
        auto: true
    }]
});

export { expect };
