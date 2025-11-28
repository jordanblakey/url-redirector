#!/usr/bin/env node

import { loadGcpSecrets } from './load-dotenv-from-gcp';
import { execSync as realExecSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { getAccessToken, uploadExtension, publishExtension, updateStoreListing } from './cws-utils';

// --- Configuration ---
const EXTENSION_ID_DEFAULT = 'jhkoaofpbohfmolalpieheaeppdaminl';

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
    
    // Resolve actual zip path if versioned (for now assuming 'extension.zip' is symlinked or copied by bundle, 
    // BUT bundle.ts creates url-redirector-vX.Y.Z.zip. 
    // We need to find the zip file.)
    
    // Quick fix: Find the only zip in build/
    const buildDir = path.resolve(__dirname, '../build');
    const files = fsFn.readdirSync(buildDir);
    const actualZipName = files.find(f => f.endsWith('.zip'));
    const actualZipPath = actualZipName ? path.join(buildDir, actualZipName) : zipPath;

    if (!fsFn.existsSync(actualZipPath)) {
        throw new Error(`Bundle failed: ${actualZipPath} not found.`);
    }

    // 3. Upload & Publish (or Dry Run)
    if (dryRun) {
        log('🛑 [DRY RUN] Skipping Upload and Publish.');
        log(`   Would upload: ${actualZipPath}`);
        log(`   To Extension ID: ${EXTENSION_ID}`);
        log('ℹ️  Run with --submit to actually publish.');
    } else {
        log('🔄 Authenticating with CWS...');
        const accessToken = await getAccessToken(CLIENT_ID!, CLIENT_SECRET!, REFRESH_TOKEN!, fetchFn);

        log('⬆️ Uploading to Chrome Web Store...');
        const uploadResult = await uploadExtension(accessToken, EXTENSION_ID, actualZipPath, fetchFn, fsFn);
        log('✅ Upload successful:', uploadResult);

        log('🚀 Publishing to Chrome Web Store...');
        const publishResult = await publishExtension(accessToken, EXTENSION_ID, fetchFn);
        log('✅ Publish successful:', publishResult);

        // 4. Update Store Listing
        const descriptionPath = path.resolve(__dirname, '../metadata/cws_description.txt');
        const promoPath = path.resolve(__dirname, '../metadata/cws_promotional_text.txt');

        if (fsFn.existsSync(descriptionPath) && fsFn.existsSync(promoPath)) {
            log('📝 Updating Store Listing...');
            const description = fsFn.readFileSync(descriptionPath, 'utf8');
            const promotionalText = fsFn.readFileSync(promoPath, 'utf8');
            
            await updateStoreListing(accessToken, EXTENSION_ID, description, promotionalText, fetchFn);
            log('✅ Store Listing updated.');
        } else {
            warn('⚠️ Metadata files not found (cws_description.txt / cws_promotional_text.txt). Skipping listing update.');
        }
    }

    // 5. Git Tag & Push
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
