# URL Redirector Chrome Extension

Reclaim your focus and master your digital habits with URL Redirector. This simple yet powerful extension acts as your personal internet traffic controller, gently nudging you away from distracting websites and towards your goals. Whether you're trying to break a social media loop or simply want to streamline your workflow, URL Redirector provides an unobtrusive way to modify your browsing patterns. Define your own rules, deflect distractions, and take back your time—one redirect at a time.

## Features

- Redirect any URL (and its subpages) to a target URL
- Handles `www` prefixes automatically
- Persistent storage of redirect rules
- Clean, modern UI for managing rules

## Installation (Local Development)

1. Open Google Chrome
2. Navigate to `chrome://extensions`
3. Enable **Developer mode** in the top right corner
4. Click **Load unpacked**
5. Select the **project root folder** (`url-redirector`)

## Usage

1. Right-click the extension icon and select **Options**
2. Enter a **Source URL** (e.g., `reddit.com`)
3. Enter a **Target URL** (e.g., `google.com`)
4. Click **Add Rule**

The extension will now redirect `reddit.com` and all its subpages (like `reddit.com/r/linux`) to `google.com`.

## Development

### Prerequisites

- Node.js and npm
- Python 3 (for local server)

### Setup

```bash
npm install
npm run build
```

### Development

To automatically rebuild TypeScript files on change:

```bash
npm run build:watch
```

Then reload the extension in `chrome://extensions` to see changes.

### Testing

See the [Testing](#testing) section below for comprehensive testing documentation and commands.

### Test Coverage

The test suite includes:
- **E2E Tests**: UI rendering, rule addition, persistence, deletion, validation
- **Build Tests**: Validates build output, file integrity, and extension completeness
- **Unit Tests**: Utility functions and helper methods

## Project Structure

```
url-redirector/
├── src/                   # TypeScript source files
│   ├── options.ts
│   ├── background.ts
│   └── types.ts
├── dist/                  # Compiled JavaScript (gitignored)
│   ├── options.js
│   └── background.js
├── manifest.json          # Extension configuration
├── options.html           # Options page UI
├── options.css            # Styling
├── test/
│   └── mock-chrome.js     # Mock Chrome API for testing
├── tests/
│   └── options.spec.ts    # Playwright test suite
├── tsconfig.json          # TypeScript configuration
└── playwright.config.ts   # Playwright configuration
```

## How It Works

1. **Options Page**: Users define redirect rules (source → target)
2. **Storage**: Rules are saved to `chrome.storage.local`
3. **Background Script**: Listens to navigation events and checks URLs against rules
4. **Redirection**: If a match is found, redirects to the target URL

## Testing

The extension uses Playwright for automated testing. Tests run against the actual `options.html` file by injecting a mock Chrome API, ensuring we test the real production code.

### Running Tests

```bash
# Run all tests
npm test

# Run build validation tests
npm run test:build

# Run tests with UI
npm run test:ui

# Run tests in headed mode (see browser)
npm run test:headed
```

### Pre-commit Hook

A pre-commit hook automatically runs tests before each commit. See [docs/pre-commit-hook.md](docs/pre-commit-hook.md) for setup details.

### Troubleshooting

If you encounter issues with Playwright UI mode (`EMFILE: too many open files`), see [docs/troubleshooting.md](docs/troubleshooting.md) for solutions.

## Documentation

Comprehensive guides and technical documentation:

### 📚 Development Guides
- **[Build Tests](docs/build-tests.md)** - Complete guide to build validation tests, what's tested, and how to add new tests
- **[Build & Bundle Refactoring](docs/build-bundle-refactoring.md)** - Analysis of the build/bundle architecture and why composition is better than duplication

### 🔧 Setup & Configuration
- **[Pre-commit Hook](docs/pre-commit-hook.md)** - Setting up automated testing before commits
- **[Troubleshooting](docs/troubleshooting.md)** - Solutions for common development issues



## Publishing

To package the extension for the Chrome Web Store:

```bash
npm run bundle
```

This command will:
1.  Clean and build the project.
2.  Create `extension.zip` in the project root.

Upload `extension.zip` to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/dev/dashboard).

## Contributing

1. Make your changes
2. Run tests: `npm test`
3. Commit (tests will run automatically via pre-commit hook)
4. Push your changes

## License

ISC
