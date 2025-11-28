import fs from 'fs-extra';
import path from 'path';
import { execSync as realExecSync } from 'child_process';

const rootDir = path.resolve(__dirname, '..');

export interface BuildOptions {
    customDist?: string;
    deps?: {
        execSync?: typeof realExecSync;
        fs?: typeof fs;
        log?: typeof console.log;
        warn?: typeof console.warn;
        error?: typeof console.error;
    };
}

export async function build(options: BuildOptions = {}) {
    const { customDist, deps = {} } = options;
    const execSync = deps.execSync || realExecSync;
    const fsFn = deps.fs || fs;
    const log = deps.log || console.log;
    const warn = deps.warn || console.warn;
    const error = deps.error || console.error;

    const distDir = customDist ? path.resolve(customDist) : path.join(rootDir, 'dist');

    try {
        log('🚀 Starting build process...');

        // 1. Clean dist directory
        log('🧹 Cleaning dist directory...');
        fsFn.emptyDirSync(distDir);

        // 2. Compile TypeScript
        log('🔨 Compiling TypeScript...');
        // Compile TypeScript with explicit ES2020 module output for the extension
        execSync(
            `tsc --module ES2020 --rootDir src --outDir "${distDir}" --lib ES2020,DOM --sourceMap true`,
            { stdio: 'inherit', cwd: rootDir }
        );

        // 3. Copy static assets
        log('📂 Copying static assets...');

        // Copy manifest.json with adjustments
        const manifestSrcPath = path.join(rootDir, 'manifest.json');
        const manifestDestPath = path.join(distDir, 'manifest.json');

        if (fsFn.existsSync(manifestSrcPath)) {
            // Read and adjust manifest for dist folder
            const manifestContent = fsFn.readFileSync(manifestSrcPath, 'utf8');
            const manifest = JSON.parse(manifestContent);

            if (manifest.background && manifest.background.service_worker) {
                manifest.background.service_worker = manifest.background.service_worker.replace('dist/', '');
            }

            if (manifest.content_scripts) {
                manifest.content_scripts.forEach((script: any) => {
                    if (script.js) {
                        script.js = script.js.map((js: string) => js.replace('dist/', ''));
                    }
                });
            }

            // Adjust asset paths: assets/... -> ... (since we copy assets to dist root)
            const manifestStr = JSON.stringify(manifest, null, 2);
            const adjustedManifest = manifestStr.replace(/assets\//g, '');

            fsFn.writeFileSync(manifestDestPath, adjustedManifest);
            log(`   ✅ Copied and adjusted manifest.json`);
        }

        // Copy assets directory contents to dist root
        const assetsDir = path.join(rootDir, 'assets');
        if (fsFn.existsSync(assetsDir)) {
            await fsFn.copy(assetsDir, distDir);
            log(`   ✅ Copied assets`);
        } else {
            warn(`   ⚠️  assets directory not found, skipping...`);
        }

        log('🎉 Build complete!');
        log(`📦 Extension files are in: ${distDir}`);

    } catch (err: unknown) {
        error('❌ Build failed:', err);
        process.exit(1);
    }
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const customDist = args[0];
    build({ customDist });
}
