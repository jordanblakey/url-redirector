import fs from 'fs-extra';
import path from 'path';

const rootDir = path.resolve(__dirname, '..');

export async function updateManifest() {
    try {
        const packageJsonPath = path.join(rootDir, 'package.json');
        const manifestJsonPath = path.join(rootDir, 'manifest.json');

        if (!fs.existsSync(packageJsonPath)) {
            throw new Error('package.json not found');
        }

        if (!fs.existsSync(manifestJsonPath)) {
            throw new Error('manifest.json not found');
        }

        const packageJson = await fs.readJson(packageJsonPath);
        const manifestJson = await fs.readJson(manifestJsonPath);

        const version = packageJson.version;
        if (!version) {
            throw new Error('Version not found in package.json');
        }

        console.log(`Current package.json version: ${version}`);
        console.log(`Current manifest.json version: ${manifestJson.version}`);

        if (manifestJson.version !== version) {
            manifestJson.version = version;
            await fs.writeJson(manifestJsonPath, manifestJson, { spaces: 2 });
            console.log(`✅ Updated manifest.json version to ${version}`);
        } else {
            console.log('ℹ️  manifest.json version is already up to date');
        }

    } catch (error) {
        console.error('❌ Failed to update manifest.json:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    updateManifest();
}
