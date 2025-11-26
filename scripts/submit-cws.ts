#!/usr/bin/env node

import { loadGcpSecrets } from './load-dotenv-from-gcp';
import { execSync as realExecSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

// --- Configuration ---
const EXTENSION_ID_DEFAULT = 'jhkoaofpbohfmolalpieheaeppdaminl';
const PUBLISHER_ID_DEFAULT = 'c173d09b-31cf-48ff-bd4b-270d57317183';

// --- Interfaces ---
export interface SubmitCwsOptions {
    dryRun: boolean;
    deps?: {
        execSync?: typeof realExecSync;
        fetch?: typeof fetch;
        log?: typeof console.log;
        warn?: typeof console.warn;
        error?: typeof console.error;
        loadGcpSecrets?: typeof loadGcpSecrets;
        fs?: typeof fs;
    };
}

// --- Helper Functions ---
async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string, fetchFn: typeof fetch) {
    const response = await fetchFn('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to get access token: ${response.status} ${text}`);
    }
    return (await response.json()).access_token;
}

async function uploadExtension(accessToken: string, extensionId: string, zipPath: string, fetchFn: typeof fetch, fsFn: typeof fs) {
    const uploadUrl = `https://www.googleapis.com/upload/chromewebstore/v1.1/items/${extensionId}`;
    const zipStream = fsFn.createReadStream(zipPath);

    // @ts-ignore
    const response = await fetchFn(uploadUrl, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-goog-api-version': '2',
        },
        // @ts-ignore
        body: zipStream,
        duplex: 'half'
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to upload extension: ${response.status} ${text}`);
    }

    const data = await response.json();
    return data;
}

async function publishExtension(accessToken: string, extensionId: string, fetchFn: typeof fetch) {
    const publishUrl = `https://www.googleapis.com/chromewebstore/v1.1/items/${extensionId}/publish`;

    const response = await fetchFn(publishUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-goog-api-version': '2',
        },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to publish extension: ${response.status} ${text}`);
    }

    const data = await response.json();
    return data;
}

// --- Main Logic ---
export async function submitCws(options: SubmitCwsOptions) {
    const { dryRun, deps = {} } = options;
    const execSync = deps.execSync || realExecSync;
    const fetchFn = deps.fetch || global.fetch;
    const log = deps.log || console.log;
    const warn = deps.warn || console.warn;
    const loadSecrets = deps.loadGcpSecrets || loadGcpSecrets;
    const fsFn = deps.fs || fs;

    log(`🚀 CWS Submission Script (${dryRun ? 'DRY RUN' : 'SUBMIT MODE'})`);

    // 1. Load Secrets
    log('🔑 Loading secrets...');
    await loadSecrets();

    const CLIENT_ID = process.env.CWS_CLIENT_ID;
    const CLIENT_SECRET = process.env.CWS_CLIENT_SECRET;
    const REFRESH_TOKEN = process.env.CWS_REFRESH_TOKEN;
    const EXTENSION_ID = process.env.CWS_EXTENSION_ID || EXTENSION_ID_DEFAULT;

    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
        if (dryRun) {
            warn('⚠️ Missing CWS credentials, but proceeding in DRY RUN mode.');
        } else {
            throw new Error('Missing required environment variables (CWS_CLIENT_ID, CWS_CLIENT_SECRET, CWS_REFRESH_TOKEN).');
        }
    }

    // 2. Bundle Extension
    log('📦 Bundling extension...');
    execSync('npm run bundle', { stdio: 'inherit' });
    const zipPath = path.resolve(__dirname, '../build/extension.zip');

    if (!fsFn.existsSync(zipPath)) {
        throw new Error(`Bundle failed: ${zipPath} not found.`);
    }

    // 3. Upload & Publish (or Dry Run)
    if (dryRun) {
        log('🛑 [DRY RUN] Skipping Upload and Publish.');
        log(`   Would upload: ${zipPath}`);
        log(`   To Extension ID: ${EXTENSION_ID}`);
        log('ℹ️  Run with --submit to actually publish.');
    } else {
        log('🔄 Authenticating with CWS...');
        const accessToken = await getAccessToken(CLIENT_ID!, CLIENT_SECRET!, REFRESH_TOKEN!, fetchFn);

        log('⬆️ Uploading to Chrome Web Store...');
        const uploadResult = await uploadExtension(accessToken, EXTENSION_ID, zipPath, fetchFn, fsFn);
        log('✅ Upload successful:', uploadResult);

        log('🚀 Publishing to Chrome Web Store...');
        const publishResult = await publishExtension(accessToken, EXTENSION_ID, fetchFn);
        log('✅ Publish successful:', publishResult);
    }

    // 4. Git Tag & Push
    const manifestPath = path.resolve(__dirname, '../manifest.json');
    const manifest = fsFn.readJsonSync(manifestPath);
    const version = manifest.version;
    const tagName = `v${version}`;

    if (dryRun) {
        log(`🛑 [DRY RUN] Skipping Git Tag and Push.`);
        log(`   Would create tag: ${tagName}`);
        log(`   Would push tag: ${tagName}`);
    } else {
        log(`🏷️ Creating git tag: ${tagName}`);
        try {
            execSync(`git tag ${tagName}`, { stdio: 'inherit' });
        } catch (e) {
            warn(`⚠️ Tag ${tagName} might already exist.`);
        }

        log('⬆️ Pushing tags to remote...');
        execSync('git push && git push --tags', { stdio: 'inherit' });
    }

    log('\n✅ Submission script finished successfully!');
}

// --- Execution ---
if (require.main === module) {
    (async () => {
        try {
            const args = process.argv.slice(2);
            const isSubmit = args.includes('--submit');
            await submitCws({ dryRun: !isSubmit });
        } catch (error) {
            console.error('\n❌ Script failed:', error);
            process.exit(1);
        }
    })();
}
