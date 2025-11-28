import { loadGcpSecrets } from './load-dotenv-from-gcp';
import { execSync as realExecSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import {
  getAccessToken,
  uploadExtension,
  publishExtension,
  updateStoreListing,
  getStoreListing,
} from './cws-utils';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CwsListing } from '../src/types';

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
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    if (dryRun) {
      warn('⚠️ Missing CWS credentials, but proceeding in DRY RUN mode.');
    } else {
      throw new Error(
        'Missing required environment variables (CWS_CLIENT_ID, CWS_CLIENT_SECRET, CWS_REFRESH_TOKEN).',
      );
    }
  }

  // 2. Bundle Extension
  log('📦 Bundling extension...');
  execSync('npm run bundle', { stdio: 'inherit' });
  const zipPath = path.resolve(__dirname, '../build/extension.zip');

  // Resolve actual zip path
  const buildDir = path.resolve(__dirname, '../build');
  const files = fsFn.readdirSync(buildDir);
  const actualZipName = files.find((f) => f.endsWith('.zip'));
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
    const uploadResult = await uploadExtension(
      accessToken,
      EXTENSION_ID,
      actualZipPath,
      fetchFn,
      fsFn,
    );
    log('✅ Upload successful:', uploadResult);

    log('🚀 Publishing to Chrome Web Store...');
    const publishResult = await publishExtension(accessToken, EXTENSION_ID, fetchFn);
    log('✅ Publish successful:', publishResult);

    // 4. Update Store Listing with Gemini
    const manifestPath = path.resolve(__dirname, '../manifest.json');
    const manifest = fsFn.readJsonSync(manifestPath);
    const currentVersion = manifest.version;
    const previousVersion = await getPreviousVersion(currentVersion, execSync);
    const versionType = getVersionType(currentVersion, previousVersion);

    log(
      `Current version: ${currentVersion}, Previous version: ${previousVersion}, Version type: ${versionType}`,
    );

    // Read changelog
    const recentUpdatesPath = path.resolve(__dirname, '../metadata/recent_updates.txt');
    let changelog = '';
    if (fsFn.existsSync(recentUpdatesPath)) {
      changelog = fsFn.readFileSync(recentUpdatesPath, 'utf8');
    } else {
      warn('⚠️ metadata/recent_updates.txt not found.');
    }

    // Read description template
    const descriptionTemplatePath = path.resolve(__dirname, '../metadata/description_template.txt');
    let descriptionTemplate = '';
    if (fsFn.existsSync(descriptionTemplatePath)) {
      descriptionTemplate = fsFn.readFileSync(descriptionTemplatePath, 'utf8');
    } else {
      warn('⚠️ metadata/description_template.txt not found.');
    }

    if (changelog && descriptionTemplate && GEMINI_API_KEY) {
      log('Fetching current store listing...');
      const listingData: CwsListing = await getStoreListing(accessToken, EXTENSION_ID, fetchFn);
      const currentListing = listingData.items[0];

      if (currentListing) {
        const currentDescription = currentListing.fullDescription;
        let newDescription = currentDescription;
        let newPromotionalText = currentListing.promotionalText;

        log('🤖 Calling Gemini to merge description...');
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
                You are a Chrome Web Store listing manager.
                Your task is to update the store description based on the new version changes.

                Inputs:
                1. Current Description (from store):
                """
                ${currentDescription}
                """

                2. New Updates (Changes since last version):
                """
                ${changelog}
                """

                3. Description Template (Target structure):
                """
                ${descriptionTemplate}
                """

                4. Update Type: "${versionType}" (current version: ${currentVersion})

                Instructions:
                - Use the Template as the base structure.
                - Replace {{RECENT_UPDATES}} with the "What's New" section.
                - "What's New" Section Logic:
                    - IF Update Type is "patch": Retain the existing "What's New" entries from the Current Description (if any) and APPEND/PREPEND the New Updates. Keep them reverse chronological (newest first).
                    - IF Update Type is "major" or "minor": REPLACE the "What's New" section entirely with the New Updates.
                - Format the "What's New" section clearly, e.g., "### What's New in v${currentVersion}:".
                - Ensure the rest of the description matches the Template content.
                - Output ONLY the full new description text. Do not output markdown code blocks unless the description itself uses them.
                `;

        const result = await model.generateContent(prompt);
        newDescription = result.response.text().trim();

        // Update promotional text logic (keep simple regex for now or ask Gemini too)
        const userFacingMatch = changelog.match(/## User Facing\n([\s\S]*?)(?=\n##|$)/);
        const userFacingChanges = userFacingMatch ? userFacingMatch[1].trim() : '';
        const firstUserFacingChange = userFacingChanges.split('\n')[0].replace(/^\*\s*/, '');

        if (firstUserFacingChange) {
          if (versionType === 'patch') {
            newPromotionalText += ` | v${currentVersion}: ${firstUserFacingChange}`;
          } else {
            newPromotionalText = `v${currentVersion}: ${firstUserFacingChange}`;
          }
        }

        log('Updating CWS listing...');
        await updateStoreListing(
          accessToken,
          EXTENSION_ID,
          newDescription,
          newPromotionalText,
          fetchFn,
        );
        log('✅ CWS listing description updated successfully.');
      } else {
        warn('⚠️ No existing listing found to update.');
      }
    } else {
      warn('⚠️ Missing prerequisites for AI description update (Changelog, Template, or API Key).');
    }
  }

  // 5. Git Tag & Push (Keep as is)
  // ... (Existing tagging logic is good, but user wants postversion to NOT call submitCws, so submitCws must handle tagging if run in CI?
  // Actually, if CI runs on Release event, the tag ALREADY EXISTS.
  // So we should skip tagging if running in CI/Release flow?
  // Or submitCws handles everything.

  // If we run submitCws from CI triggered by Release:
  // The tag already exists (created by local npm version).
  // So 'git tag' will fail or warn.
  // We should check if tag exists.

  // For now, let's keep existing logic, it catches error: "Tag ... might already exist."
  const manifestPath = path.resolve(__dirname, '../manifest.json');
  const manifest = fsFn.readJsonSync(manifestPath);
  const version = manifest.version;
  const tagName = `v${version}`;

  if (!dryRun) {
    log(`🏷️ Creating git tag: ${tagName}`);
    try {
      execSync(`git tag ${tagName}`, { stdio: 'inherit' });
      log('⬆️ Pushing tags to remote...');
      execSync('git push && git push --tags', { stdio: 'inherit' });
    } catch (_e) {
      warn(`⚠️ Tag ${tagName} might already exist or push failed.`);
    }
  } else {
    log('🛑 [DRY RUN] Skipping Git Tag and Push.');
  }

  log('\n✅ Submission script finished successfully!');
}

async function getPreviousVersion(
  currentVersion: string,
  execSyncFn: typeof realExecSync,
): Promise<string | null> {
  try {
    const output = execSyncFn(`git describe --tags --abbrev=0 ${currentVersion}~1`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();
    return output;
  } catch (_e) {
    return null;
  }
}

function getVersionType(
  currentVersion: string,
  previousVersion: string | null,
): 'major' | 'minor' | 'patch' | 'initial' {
  if (!previousVersion) {
    return 'initial';
  }
  const currentParts = currentVersion.split('.').map(Number);
  const previousParts = previousVersion.split('.').map(Number);

  if (currentParts[0] > previousParts[0]) return 'major';
  if (currentParts[1] > previousParts[1]) return 'minor';
  if (currentParts[2] > previousParts[2]) return 'patch';
  return 'initial';
}

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
