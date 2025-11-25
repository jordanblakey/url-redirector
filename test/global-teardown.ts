import fs from 'fs';
import path from 'path';
import { addCoverageReport } from 'monocart-reporter';

export default async function globalTeardown() {
    // Process Node.js V8 coverage
    const coverageDir = process.env.NODE_V8_COVERAGE;
    if (coverageDir && fs.existsSync(coverageDir)) {
        const files = fs.readdirSync(coverageDir);
        const coverageList: any[] = [];

        for (const file of files) {
            if (file.endsWith('.json')) {
                const content = fs.readFileSync(path.join(coverageDir, file), 'utf-8');
                try {
                    const coverage = JSON.parse(content);
                    if (coverage && coverage.result) {
                        coverage.result.forEach((entry: any) => {
                            // Filter for source files only
                            if (entry.url && entry.url.startsWith('file://') && entry.url.includes('/src/')) {
                                // Convert file URL to path for consistency if needed, 
                                // but monocart handles file:// URLs well for V8 coverage
                                coverageList.push(entry);
                            }
                        });
                    }
                } catch (e) {
                    console.error(`Failed to parse coverage file ${file}:`, e);
                }
            }
        }

        if (coverageList.length > 0) {
            console.log(`Adding ${coverageList.length} Node.js coverage entries to report`);
            await addCoverageReport(coverageList, {
                config: {
                    name: 'URL Redirector E2E Coverage Report',
                    outputFile: 'test/coverage/index.html'
                }
            } as any);
        }
    }
}
