import { test as base } from '@playwright/test';
import { addCoverageReport } from 'monocart-reporter';
import { Session } from 'inspector';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

export const test = base.extend<{ autoCollectCoverage: void }>({
    autoCollectCoverage: [async ({ }, use, testInfo) => {
        const session = new Session();
        session.connect();
        const post = promisify(session.post).bind(session) as any;

        try {
            await post('Profiler.enable');
            await post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
        } catch (e) {
            console.warn('Failed to start coverage:', e);
        }

        await use();

        try {
            const { result } = await post('Profiler.takePreciseCoverage') as any;
            await post('Profiler.stopPreciseCoverage');
            await post('Profiler.disable');

            const coverage = result;

            if (coverage) {
                // Filter for our scripts
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
    }, { auto: true, scope: 'test' }]
});

export const expect = base.expect;
