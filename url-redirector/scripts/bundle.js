const fs = require('fs-extra');
const path = require('path');
const AdmZip = require('adm-zip');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const zipPath = path.join(rootDir, 'extension.zip');

async function bundle() {
    try {
        console.log('🚀 Starting bundle process...');

        // 1. Clean & Build
        console.log('🧹 Cleaning and building...');
        fs.emptyDirSync(distDir);
        execSync('npm run build', { stdio: 'inherit', cwd: rootDir });

        // 2. Copy Assets
        console.log('📂 Copying assets...');
        const assets = [
            'manifest.json',
            'icons',
            'options.html',
            'options.css'
        ];

        for (const asset of assets) {
            if (asset === 'manifest.json') {
                const manifestContent = fs.readFileSync(path.join(rootDir, asset), 'utf8');
                const manifest = JSON.parse(manifestContent);
                // Adjust background script path for the bundle where dist is root
                if (manifest.background && manifest.background.service_worker) {
                    manifest.background.service_worker = manifest.background.service_worker.replace('dist/', '');
                }
                fs.writeFileSync(path.join(distDir, asset), JSON.stringify(manifest, null, 2));
            } else {
                await fs.copy(path.join(rootDir, asset), path.join(distDir, asset));
            }
        }

        // 3. Zip for Web Store
        console.log('🤐 Zipping for Web Store...');
        const webStoreZip = new AdmZip();
        webStoreZip.addLocalFolder(distDir);
        webStoreZip.writeZip(zipPath);
        console.log(`   ✅ Created ${zipPath}`);

        console.log('🎉 Bundling complete!');

    } catch (error) {
        console.error('❌ Bundling failed:', error);
        process.exit(1);
    }
}

bundle();
