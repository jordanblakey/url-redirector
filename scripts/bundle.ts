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

    // 3.5. Copy and rename release icons, then remove original release icons
    log('🖼️ Preparing release icons...');
    const icon128Src = path.join(distDir, 'icons/icon-release-128.png');
    const icon128Dest = path.join(distDir, 'icons/icon-128.png');
    const icon256Src = path.join(distDir, 'icons/icon-release-256.png');
    const icon256Dest = path.join(distDir, 'icons/icon-256.png');

    if (fsFn.existsSync(icon128Src)) {
      fsFn.copySync(icon128Src, icon128Dest, { overwrite: true });
      log(`   ✅ Copied ${path.basename(icon128Src)} to ${path.basename(icon128Dest)}`);
      fsFn.removeSync(icon128Src);
      log(`   🗑️ Removed ${path.basename(icon128Src)}`);
    } else {
      log(`   ⚠️ Warning: ${path.basename(icon128Src)} not found. Skipping.`);
    }

    if (fsFn.existsSync(icon256Src)) {
      fsFn.copySync(icon256Src, icon256Dest, { overwrite: true });
      log(`   ✅ Copied ${path.basename(icon256Src)} to ${path.basename(icon256Dest)}`);
      fsFn.removeSync(icon256Src);
      log(`   🗑️ Removed ${path.basename(icon256Src)}`);
    } else {
      log(`   ⚠️ Warning: ${path.basename(icon256Src)} not found. Skipping.`);
    }
    log('');

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
