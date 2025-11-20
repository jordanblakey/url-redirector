# URL Redirector Chrome Extension

A simple Chrome extension that redirects URLs based on user-defined rules.

## Features

- Redirect any URL (and its subpages) to a target URL
- Handles `www` prefixes automatically
- Persistent storage of redirect rules
- Clean, modern UI for managing rules

## Installation

1. Open Google Chrome
2. Navigate to `chrome://extensions`
3. Enable **Developer mode** in the top right corner
4. Click **Load unpacked**
5. Select the `url-redirector` folder

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
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests in headed mode (see browser)
npm run test:headed
```

### Test Coverage

The test suite includes:
- UI rendering tests
- Rule addition functionality
- Persistence verification
- Rule deletion
- Multiple rules handling
- Validation tests

## Project Structure

```
url-redirector/
├── manifest.json          # Extension configuration
├── options.html           # Options page UI
├── options.css            # Styling
├── options.js             # Options page logic
├── background.js          # Redirection logic
├── test/
│   └── mock-chrome.js     # Mock Chrome API for testing
├── tests/
│   └── options.spec.js    # Playwright test suite
└── playwright.config.js   # Playwright configuration
```

## How It Works

1. **Options Page**: Users define redirect rules (source → target)
2. **Storage**: Rules are saved to `chrome.storage.local`
3. **Background Script**: Listens to navigation events and checks URLs against rules
4. **Redirection**: If a match is found, redirects to the target URL

## Testing

The extension uses Playwright for automated testing. Tests run against the actual `options.html` file by injecting a mock Chrome API, ensuring we test the real production code.
