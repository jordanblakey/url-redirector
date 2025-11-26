#!/usr/bin/env node

import { execSync as realExecSync, exec as realExec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { promisify } from 'util';
import { loadGcpSecrets } from './load-dotenv-from-gcp';

const exec = promisify(realExec);

// --- Configuration ---
const EXTENSION_ID_DEFAULT = 'jhkoaofpbohfmolalpieheaeppdaminl';


// --- Interfaces ---
interface ReleaseOptions {
    dryRun: boolean;
    versionLevel: 'patch' | 'minor' | 'major';
    deps?: {
        execSync?: typeof realExecSync;
        log?: typeof console.log;
        warn?: typeof console.warn;
        error?: typeof console.error;
        fs?: typeof fs;
        fetch?: typeof fetch;
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

async function getLatestTag(execSync: typeof realExecSync): Promise<string> {
    try {
        return execSync('git describe --tags --abbrev=0').toString().trim();
    } catch (error) {
        return '';
    }
}

async function checkReleaseExists(tagName: string, log: typeof console.log): Promise<boolean> {
    if (!tagName) return false;
    try {
        await exec(`gh release view ${tagName}`);
        log(`✅ Release '${tagName}' found on GitHub.`);
        return true;
    } catch (error) {
        log(`ℹ️ Release '${tagName}' not found on GitHub.`);
        return false;
    }
}

async function deleteTag(tagName: string, execSync: typeof realExecSync, log: typeof console.log, dryRun: boolean) {
    log(`🔥 Deleting local and remote tag: ${tagName}`);
    if (!dryRun) {
        execSync(`git tag -d ${tagName}`, { stdio: 'inherit' });
        execSync(`git push origin :refs/tags/${tagName}`, { stdio: 'inherit' });
    }
}

// --- Main Logic ---
export async function release(options: ReleaseOptions) {
    const { dryRun, versionLevel, deps = {} } = options;
    const execSync = deps.execSync || realExecSync;
    const log = deps.log || console.log;
    const warn = deps.warn || console.warn;
    const fetchFn = deps.fetch || global.fetch;
    const fsFn = deps.fs || fs;


    log(`🚀 Kicking off release process... (${dryRun ? 'DRY RUN' : 'LIVE RUN'})`);

    // 1. Check for failed release
    const latestTag = await getLatestTag(execSync);
    const releaseExists = await checkReleaseExists(latestTag, log);

    if (latestTag && !releaseExists) {
        warn(`⚠️ Found tag '${latestTag}' without a corresponding GitHub Release.`);
        warn('Assuming previous release failed. Re-running for the same version.');
        await deleteTag(latestTag, execSync, log, dryRun);
    } else {
        // 2. Bump version
        log(`📈 Bumping version to the next '${versionLevel}' level...`);
        if (!dryRun) {
            execSync(`npm version ${versionLevel} --no-git-tag-version`, { stdio: 'inherit' });
        }
    }

    // 3. Get the current version
    const packageJsonPath = path.resolve(__dirname, '../package.json');
    const packageJson = fs.readJsonSync(packageJsonPath);
    const version = packageJson.version;
    const tagName = `v${version}`;

    // Update manifest.json
    const manifestPath = path.resolve(__dirname, '../manifest.json');
    const manifest = fs.readJsonSync(manifestPath);
    manifest.version = version;
    fs.writeJsonSync(manifestPath, manifest, { spaces: 2 });

    log(`📦 Version to release: ${version}`);

    // 4. Submit to CWS
    log('🚀 Submitting to Chrome Web Store...');
        // 4.1. Load Secrets
    log('🔑 Loading secrets...');
    await loadGcpSecrets();

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

    // 4.2. Bundle Extension
    log('📦 Bundling extension...');
    execSync('npm run bundle', { stdio: 'inherit' });
    const zipPath = path.resolve(__dirname, '../build/extension.zip');

    if (!fsFn.existsSync(zipPath)) {
        throw new Error(`Bundle failed: ${zipPath} not found.`);
    }
     // 4.3. Upload & Publish (or Dry Run)
     if (dryRun) {
        log('🛑 [DRY RUN] Skipping Upload and Publish.');
        log(`   Would upload: ${zipPath}`);
        log(`   To Extension ID: ${EXTENSION_ID}`);
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


    // 5. Create Git tag and push
    log(`🏷️  Creating git tag: ${tagName}`);
    if (!dryRun) {
        execSync(`git tag ${tagName}`, { stdio: 'inherit' });
        execSync('git push && git push --tags', { stdio: 'inherit' });
    }

    // 6. Create GitHub Release
    log('🎉 Creating GitHub Release...');
    if (!dryRun) {
        execSync(`gh release create ${tagName} --generate-notes`, { stdio: 'inherit' });
    }

    log('\n✅ Release process finished successfully!');
}

// --- Execution ---
if (require.main === module) {
    (async () => {
        try {
            const args = process.argv.slice(2);
            const isDryRun = args.includes('--dry-run');
            const versionArg = args.find(arg => ['patch', 'minor', 'major'].includes(arg)) as 'patch' | 'minor' | 'major' | undefined;

            if (!versionArg) {
                throw new Error('Missing version level argument. Please specify "patch", "minor", or "major".');
            }

            await release({ dryRun: isDryRun, versionLevel: versionArg });
        } catch (error) {
            console.error('\n❌ Script failed:', error);
            process.exit(1);
        }
    })();
}
