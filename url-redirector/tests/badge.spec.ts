import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Extension Configuration', () => {
    test('manifest should have action field for badge support', () => {
        const manifestPath = path.join(process.cwd(), 'manifest.json');
        const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent);

        // Verify action field exists (required for chrome.action API)
        expect(manifest.action).toBeDefined();
        expect(manifest.action).toHaveProperty('default_title');
    });

    test('background script should be compiled', () => {
        const backgroundPath = path.join(process.cwd(), 'dist/background.js');
        expect(fs.existsSync(backgroundPath)).toBe(true);

        const backgroundContent = fs.readFileSync(backgroundPath, 'utf-8');

        // Verify badge-related code exists in compiled output
        expect(backgroundContent).toContain('setBadgeText');
        expect(backgroundContent).toContain('setBadgeBackgroundColor');
        expect(backgroundContent).toContain('🔀');
    });
});
