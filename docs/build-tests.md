# Build Validation Tests

This document describes the comprehensive test suite for validating the build process of the URL Redirector Chrome extension.

## Overview

The build validation tests ensure that the `npm run build` command produces a complete, valid Chrome extension in the `dist/` folder with all necessary files and correct configurations.

## Running the Tests

```bash
# Run only build validation tests
npm run test:build

# Run all tests (including build tests)
npm test
```

## Test Categories

### 1. Required Files
Validates that all essential files are present in the `dist/` folder:
- ✅ `manifest.json` exists and is valid JSON
- ✅ `manifest.json` contains all required Chrome extension fields
- ✅ `options.html` exists
- ✅ `options.css` exists
- ✅ `icons/` directory exists

### 2. Compiled JavaScript Files
Ensures TypeScript compilation succeeded:
- ✅ `background.js` exists and contains valid code
- ✅ `options.js` exists
- ✅ `utils.js` exists
- ✅ `types.js` exists
- ✅ All JS files have non-zero size

### 3. Icon Files
Validates icon assets:
- ✅ `icons/icon-128.png` exists and has content
- ✅ `icons/icon-256.png` exists and has content
- ✅ All icons referenced in `manifest.json` exist

### 4. File Integrity
Checks that files are properly linked:
- ✅ `options.html` references `options.css`
- ✅ `options.html` references `options.js`
- ✅ `manifest.json` background service_worker references an existing file
- ✅ All manifest icon paths reference existing files

### 5. Extension Completeness
Validates the extension can be loaded in Chrome:
- ✅ All required files for a working extension are present
- ✅ No TypeScript source files (`.ts`) are in `dist/`
- ✅ Extension structure meets Chrome Web Store requirements
- ✅ Manifest version is 3
- ✅ Service worker file exists
- ✅ Options page exists

### 6. Build Reproducibility
Ensures consistent build output:
- ✅ Running build twice produces the same file list

## What Gets Tested

The test suite validates **25 different aspects** of the build output, including:

1. Directory structure
2. File existence
3. File content validity
4. JSON parsing
5. File references and links
6. Chrome extension requirements
7. Build consistency

## Build Process

The build script (`scripts/build.js`) performs these steps:

1. **Clean**: Empties the `dist/` directory
2. **Compile**: Runs TypeScript compiler (`tsc`)
3. **Copy Assets**: Copies static files:
   - `manifest.json` (with path adjustments)
   - `icons/` folder
   - `options.html`
   - `options.css`

### Manifest Adjustment

The build script automatically adjusts the `manifest.json` file:
- **Source**: `"service_worker": "dist/background.js"`
- **Built**: `"service_worker": "background.js"`

This ensures the extension can be loaded directly from the `dist/` folder.

## Test Configuration

The build tests run in **serial mode** (not parallel) to avoid race conditions when multiple tests trigger builds simultaneously.

```typescript
test.describe.configure({ mode: 'serial' });
```

## CI Integration

These tests are automatically run in the CI pipeline to ensure every build produces a valid extension package.

## Troubleshooting

### Test Failures

If tests fail, check:

1. **Missing files**: Ensure all source files exist in the root directory
2. **TypeScript errors**: Run `npm run build` manually to see compilation errors
3. **Icon files**: Verify `icons/icon-128.png` and `icons/icon-256.png` exist
4. **Manifest validity**: Check `manifest.json` is valid JSON

### Common Issues

**Issue**: Tests fail with "ENOENT: no such file or directory"
- **Solution**: Ensure you've run `npm install` and all dependencies are installed

**Issue**: Manifest validation fails
- **Solution**: Check that `manifest.json` has all required fields for Manifest V3

**Issue**: Build reproducibility test fails
- **Solution**: Check for timestamp-based or random content in build output

## Adding New Tests

To add new validation tests:

1. Open `test/unit/build.spec.ts`
2. Add a new test in the appropriate `test.describe` block
3. Follow the existing pattern for file validation
4. Run `npm run test:build` to verify

Example:
```typescript
test('new-file.txt should exist in dist', () => {
    const filePath = path.join(distDir, 'new-file.txt');
    expect(fs.existsSync(filePath)).toBe(true);
});
```

## Benefits

These tests provide:
- ✅ **Confidence**: Know the build works before deploying
- ✅ **Fast Feedback**: Catch build issues immediately
- ✅ **Documentation**: Tests serve as specification for build output
- ✅ **Regression Prevention**: Prevent accidental removal of required files
- ✅ **CI/CD Ready**: Automated validation in pipelines
