import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = path.resolve(__dirname, '..');

export async function build(distDir: string = path.join(rootDir, 'dist')) {
    try {
        console.log('🚀 Starting build process...');

        // 1. Clean dist directory
        console.log('🧹 Cleaning dist directory...');
        fs.emptyDirSync(distDir);

        // 2. Compile TypeScript
        console.log('🔨 Compiling TypeScript...');
        execSync(
            `tsc --module ES2020 --rootDir src --outDir "${distDir}" --lib ES2020,DOM --sourceMap true`,
            { stdio: 'inherit', cwd: rootDir }
        );

        // 3. Copy static assets
        console.log('📂 Copying static assets...');

        // Copy manifest.json with adjustments
        const manifestSrcPath = path.join(rootDir, 'manifest.json');
        const manifestDestPath = path.join(distDir, 'manifest.json');

        if (fs.existsSync(manifestSrcPath)) {
            const manifestContent = fs.readFileSync(manifestSrcPath, 'utf8');
            const manifest = JSON.parse(manifestContent);

            if (manifest.background && manifest.background.service_worker) {
                manifest.background.service_worker = manifest.background.service_worker.replace('dist/', '');
            }

            const manifestStr = JSON.stringify(manifest, null, 2);
            const adjustedManifest = manifestStr.replace(/assets\//g, '');
            fs.writeFileSync(manifestDestPath, adjustedManifest);
            console.log(`   ✅ Copied and adjusted manifest.json`);
        }

        // Copy assets directory contents to dist root
        const assetsDir = path.join(rootDir, 'assets');
        if (fs.existsSync(assetsDir)) {
            await fs.copy(assetsDir, distDir);
            console.log(`   ✅ Copied assets`);
        } else {
            console.warn(`   ⚠️  assets directory not found, skipping...`);
        }

        console.log('🎉 Build complete!');
        console.log(`📦 Extension files are in: ${distDir}`);

    } catch (error: unknown) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

// Self-execute if run directly
if (require.main === module) {
    const args = process.argv.slice(2);
    const customDist = args[0];
    const distDir = customDist ? path.resolve(customDist) : path.join(rootDir, 'dist');
    build(distDir);
}
