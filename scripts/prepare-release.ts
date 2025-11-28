import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { generateChangelog } from './generate-changelog';

const rootDir = path.resolve(__dirname, '..');
const manifestPath = path.join(rootDir, 'manifest.json');
const packageJsonPath = path.join(rootDir, 'package.json');
const recentUpdatesPath = path.join(rootDir, 'metadata', 'recent_updates.txt');

async function main() {
  try {
    console.log('Running changelog generation...');
    await generateChangelog();

    console.log('Updating manifest version...');
    // We read the version from package.json which should have been updated by 'npm version'
    // prior to this script running (as part of the 'version' lifecycle script).
    const packageJson = await fs.readJson(packageJsonPath);
    const version = packageJson.version;

    if (!version) {
        throw new Error('Version not found in package.json');
    }

    const manifest = await fs.readJson(manifestPath);
    if (manifest.version !== version) {
        manifest.version = version;
        await fs.writeJson(manifestPath, manifest, { spaces: 2 });
        console.log(`Manifest updated to version ${version}`);
    } else {
        console.log(`Manifest already at version ${version}`);
    }

    console.log('Staging files...');
    // We need to stage these files so they are included in the version commit created by 'npm version'
    execSync(`git add ${manifestPath} ${recentUpdatesPath}`);
    console.log('Files staged.');

  } catch (error) {
    console.error('Error preparing release:', error);
    process.exit(1);
  }
}

main();
