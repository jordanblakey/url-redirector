const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

async function build() {
    try {
        console.log('🚀 Starting build process...');

        // 1. Clean dist directory
        console.log('🧹 Cleaning dist directory...');
        fs.emptyDirSync(distDir);

        // 2. Compile TypeScript
        console.log('🔨 Compiling TypeScript...');
        execSync('tsc', { stdio: 'inherit', cwd: rootDir });

        // 3. Copy static assets
        console.log('📂 Copying static assets...');
        const assets = [
            'manifest.json',
            'icons',
            'options.html',
            'options.css'
        ];

        for (const asset of assets) {
            const srcPath = path.join(rootDir, asset);
            const destPath = path.join(distDir, asset);

            if (fs.existsSync(srcPath)) {
                if (asset === 'manifest.json') {
                    // Read and adjust manifest for dist folder
                    const manifestContent = fs.readFileSync(srcPath, 'utf8');
                    const manifest = JSON.parse(manifestContent);

                    // Adjust background script path: dist/background.js -> background.js
                    if (manifest.background && manifest.background.service_worker) {
                        manifest.background.service_worker = manifest.background.service_worker.replace('dist/', '');
                    }

                    fs.writeFileSync(destPath, JSON.stringify(manifest, null, 2));
                    console.log(`   ✅ Copied and adjusted ${asset}`);
                } else {
                    await fs.copy(srcPath, destPath);
                    console.log(`   ✅ Copied ${asset}`);
                }
            } else {
                console.warn(`   ⚠️  ${asset} not found, skipping...`);
            }
        }

        console.log('🎉 Build complete!');
        console.log(`📦 Extension files are in: ${distDir}`);

    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

build();
