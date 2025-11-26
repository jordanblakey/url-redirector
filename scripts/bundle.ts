import fs from 'fs-extra';
import path from 'path';
import AdmZip from 'adm-zip';
import { execSync } from 'child_process';

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const buildDir = path.join(rootDir, 'build');

async function bundle() {
    try {
        console.log('📦 Starting bundle process...\n');

        // 1. Get version from package.json
        const packageJson = fs.readJsonSync(path.join(rootDir, 'package.json'));
        const version = packageJson.version;
        if (!version) {
            throw new Error('Version not found in package.json');
        }
        console.log(`   Detected version: ${version}`);

        // 2. Define versioned zip path
        const zipName = `url-redirector-v${version}.zip`;
        const zipPath = path.join(buildDir, zipName);

        // 3. Ensure build directory exists
        fs.ensureDirSync(buildDir);

        // 4. Run the build script (which handles cleaning, compiling, and copying)
        console.log('🔨 Running build...');
        execSync('npm run build', { stdio: 'inherit', cwd: rootDir });
        console.log('');

        // 5. Verify dist directory has content
        if (!fs.existsSync(distDir) || fs.readdirSync(distDir).length === 0) {
            throw new Error('Build failed: dist directory is empty');
        }

        // 6. Create ZIP for Chrome Web Store
        console.log(`🤐 Creating Web Store package: ${zipName}...`);
        const webStoreZip = new AdmZip();
        webStoreZip.addLocalFolder(distDir);
        webStoreZip.writeZip(zipPath);

        const stats = fs.statSync(zipPath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`   ✅ Created ${zipPath} (${sizeKB} KB)\n`);

        console.log('🎉 Bundle complete!');
        console.log(`📂 Extension: ${distDir}`);
        console.log(`📦 Web Store ZIP: ${zipPath}`);

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('❌ Bundling failed:', errorMessage);
        process.exit(1);
    }
}

bundle();
