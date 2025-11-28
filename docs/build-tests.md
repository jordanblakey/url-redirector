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

## Test Coverage

The test suite validates multiple aspects of the build output:

### 1. Required Files

Validates that all essential files are present in the `dist/` folder:

- `manifest.json` exists and is valid JSON
- `html/options.html` and `styles/options.css` exist
- `icons/` directory exists

### 2. Compiled JavaScript Files

Ensures TypeScript compilation succeeded:

- `background.js`, `options.js`, `utils.js` exist
- All JS files have non-zero size

### 3. Icon Files

Validates icon assets:

- `icons/icon-128.png` and `icons/icon-256.png` exist and have content
- All icons referenced in `manifest.json` exist

### 4. File Integrity

Checks that files are properly linked:

- `html/options.html` references `styles/options.css` and `options.js`
- `manifest.json` background `service_worker` references an existing file

### 5. Extension Completeness

Validates the extension can be loaded in Chrome:

- No TypeScript source files (`.ts`) are in `dist/`
- Manifest version is 3
- Service worker file and Options page exist

### 6. Build Reproducibility

Ensures consistent build output by verifying that running the build twice produces the exact same file list.

## Build Process

The build script (`scripts/build.ts`) performs these steps:

1. **Clean**: Empties the `dist/` directory.
2. **Compile**: Runs TypeScript compiler (`tsc`).
3. **Copy Assets**: Copies the `assets/` directory and `manifest.json`.

### Manifest Adjustment

The build script automatically adjusts the `manifest.json` file so that `"service_worker"` points to `"background.js"` instead of `"dist/background.js"`. This ensures the extension can be loaded directly from the `dist/` folder.

## Adding New Tests

To add new validation tests, modify `test/unit/build.spec.ts`.

Example:

```typescript
test('new-file.txt should exist in dist', () => {
  const filePath = path.join(distDir, 'new-file.txt');
  expect(fs.existsSync(filePath)).toBe(true);
});
```
