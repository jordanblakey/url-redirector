import fs from 'fs-extra';
import path from 'path';
import AdmZip from 'adm-zip';
import { execSync as realExecSync } from 'child_process';

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const buildDir = path.join(rootDir, 'build');

export interface BundleOptions {
    deps?: {
        execSync?: typeof realExecSync;
        fs?: typeof fs;
        AdmZip?: typeof AdmZip;
        log?: typeof console.log;
        error?: typeof console.error;
    };
}

export async function bundle(options: BundleOptions = {}) {
    const { deps = {} } = options;
    const execSync = deps.execSync || realExecSync;
    const fsFn = deps.fs || fs;
    const AdmZipFn = deps.AdmZip || AdmZip;
    const log = deps.log || console.log;
    const error = deps.error || console.error;

    try {
        log('📦 Starting bundle process...\n');

        // 1. Ensure build directory exists
        fsFn.ensureDirSync(buildDir);

        // 2. Run the build script (which handles cleaning, compiling, and copying)
        log('🔨 Running build...');
        execSync('npm run build', { stdio: 'inherit', cwd: rootDir });
        log('');

        // 3. Verify dist directory has content
        if (!fsFn.existsSync(distDir) || fsFn.readdirSync(distDir).length === 0) {
            throw new Error('Build failed: dist directory is empty');
        }

        // 4. Determine zip filename based on version
        const packageJsonPath = path.join(rootDir, 'package.json');
        const packageJson = fsFn.readJsonSync(packageJsonPath);
        const version = packageJson.version;
        const zipName = `url-redirector-v${version}.zip`;
        const zipPath = path.join(buildDir, zipName);

        // 5. Create ZIP for Chrome Web Store
        log('🤐 Creating Web Store package...');
        const webStoreZip = new AdmZipFn();
        webStoreZip.addLocalFolder(distDir);
        webStoreZip.writeZip(zipPath);

        const stats = fsFn.statSync(zipPath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        log(`   ✅ Created ${zipPath} (${sizeKB} KB)\n`);

        log('🎉 Bundle complete!');
        log(`📂 Extension: ${distDir}`);
        log(`📦 Web Store ZIP: ${zipPath}`);

    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        error('❌ Bundling failed:', errorMessage);
        process.exit(1);
    }
}

if (require.main === module) {
    bundle();
}
