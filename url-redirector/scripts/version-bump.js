const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const manifestJsonPath = path.join(rootDir, 'manifest.json');

function bumpVersion(version, type) {
    const parts = version.split('.').map(Number);
    while (parts.length < 3) parts.push(0); // Ensure at least 3 parts for semantic versioning

    if (type === 'major') {
        parts[0]++;
        parts[1] = 0;
        parts[2] = 0;
    } else if (type === 'minor') {
        parts[1]++;
        parts[2] = 0;
    } else {
        // patch is default
        parts[2]++;
    }
    return parts.join('.');
}

function main() {
    try {
        const bumpType = process.argv[2] || 'patch';
        if (!['major', 'minor', 'patch'].includes(bumpType)) {
            console.error('Invalid bump type. Use "major", "minor", or "patch".');
            process.exit(1);
        }

        console.log(`🚀 Bumping version (${bumpType})...`);

        // Read package.json
        const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(packageJsonContent);
        const currentVersion = packageJson.version;
        const newVersion = bumpVersion(currentVersion, bumpType);

        console.log(`   Current version: ${currentVersion}`);
        console.log(`   New version:     ${newVersion}`);

        // Update package.json
        packageJson.version = newVersion;
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        console.log(`✅ Updated package.json`);

        // Update manifest.json if it exists
        if (fs.existsSync(manifestJsonPath)) {
            const manifestJsonContent = fs.readFileSync(manifestJsonPath, 'utf8');
            const manifestJson = JSON.parse(manifestJsonContent);
            manifestJson.version = newVersion;
            fs.writeFileSync(manifestJsonPath, JSON.stringify(manifestJson, null, 2));
            console.log(`✅ Updated manifest.json`);
        }

        console.log(`🎉 Version bump complete!`);

    } catch (error) {
        console.error('❌ Version bump failed:', error);
        process.exit(1);
    }
}

main();
