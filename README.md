# URL Redirector Chrome Extension

Reclaim your focus and master your digital habits with URL Redirector. This simple yet powerful extension acts as your personal internet traffic controller, gently nudging you away from distracting websites and towards your goals. Whether you're trying to break a social media loop or simply want to streamline your workflow, URL Redirector provides an unobtrusive way to modify your browsing patterns. Define your own rules, deflect distractions, and take back your time—one redirect at a time.

## Links
- [Github](https://github.com/invisible/url-redirector)
- [Chrome Web Store - Listing](https://chrome.google.com/webstore/detail/url-redirector/jhkoaofpbohfmolalpieheaeppdaminl)

## Features

- **Universal Redirection**: Redirect any URL (and its subpages) to a target URL.
- **Smart Handling**: Automatically handles `www` prefixes and protocol normalization.
- **Persistent Storage**: Rules are saved locally and persist across browser sessions.
- **Clean UI**: Modern, intuitive interface for managing your redirect rules.

## Installation (Local Development)

1. Clone the repository.
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Open Chrome and navigate to `chrome://extensions`
5. Enable **Developer mode**.
6. Click **Load unpacked** and select the `dist/` directory created by the build.

## Usage

1. Right-click the extension icon and select **Options**, or click the extension icon in the toolbar.
2. Enter a **Source URL** (e.g., `reddit.com`)
3. Enter a **Target URL** (e.g., `google.com`)
4. Click **Add Rule**

The extension will now redirect `reddit.com` and all its subpages (e.g., `reddit.com/r/linux`) to `google.com`.

## Development

### Prerequisites

- Node.js and npm
- Python 3 (optional, for serving files if needed)

### Key Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Compiles TypeScript and copies assets to `dist/` |
| `npm run build:watch` | Rebuilds automatically on file changes |
| `npm test` | Runs the full test suite (E2E and Build validation) |
| `npm run bundle` | Creates `extension.zip` for Chrome Web Store publication |

### Project Structure

```
url-redirector/
├── src/                   # TypeScript source files
├── dist/                  # Compiled extension (gitignored)
├── test/                  # Test suites (E2E, Unit, Mocks)
├── scripts/               # Build and maintenance scripts
├── manifest.json          # Extension configuration
├── options.html           # Options page UI
├── options.css            # Styling
└── playwright.config.ts   # Testing configuration
```

## Testing

The project uses [Playwright](https://playwright.dev/) for comprehensive testing.

```bash
# Run all tests
npm test

# Run specifically the build validation tests
npm run test:build

# Run tests with visual UI
npm run test:ui
```

For more details on the build validation tests, see [docs/build-tests.md](docs/build-tests.md).

## Documentation

- **[Build System](docs/build-system.md)**: Understand how the build and bundle scripts work.
- **[Build Tests](docs/build-tests.md)**: Details on the build validation test suite.
- **[Pre-commit Hook](docs/pre-commit-hook.md)**: Setup for automated testing before commits.
- **[Source Maps](docs/sourcemaps.md)**: How to use the bundled sourcemaps for production debugging.
- **[Troubleshooting](docs/troubleshooting.md)**: Solutions for common issues.

## Contributing

1. Create a branch for your feature or fix.
2. Make changes and run `npm test` to ensure everything passes.
3. Commit your changes (the pre-commit hook will run tests automatically).
4. Push to GitHub and create a Pull Request.

## License

ISC
