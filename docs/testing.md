# Testing

This document provides an overview of the testing strategy for the URL Redirector Chrome extension, which follows the testing pyramid model.

## Testing Pyramid

Our testing strategy is divided into three layers:

### 1. Unit Tests (`/test/unit`)

- **Purpose**: To test individual functions or components in isolation.
- **Tools**: [Vitest](https://vitest.dev/)
- **Scope**: These tests are fast and focused, verifying the correctness of business logic without external dependencies.

### 2. Integration Tests (`/test/integration`)

- **Purpose**: To test the interaction between different parts of the extension.
- **Tools**: [Playwright](https://playwright.dev/)
- **Scope**: These tests ensure that different modules work together as expected, such as the popup and the storage module.

### 3. End-to-End (E2E) Tests (`/test/e2e`)

- **Purpose**: To test the complete user workflow from start to finish.
- **Tools**: [Playwright](https://playwright.dev/)
- **Scope**: These tests simulate real user interactions with the extension in a browser environment, ensuring the entire system works as intended.

## Running Tests

You can run the entire test suite or individual test types using the following `npm` commands:

- **Run all tests**: `npm test`
- **Run only unit tests**: `npm run test:unit`
- **Run only integration tests**: `npm run test:integration`
- **Run only E2E tests**: `npm run test:e2e`
- **Run only build validation tests**: `npm run test:build`

## Build Validation Tests

The build validation tests ensure that the `npm run build` command produces a complete, valid Chrome extension in the `dist/` folder with all necessary files and correct configurations.

### Test Coverage

The test suite validates multiple aspects of the auild output:

- **Required Files**: Validates that all essential files are present in the `dist/` folder.
- **Compiled JavaScript Files**: Ensures TypeScript compilation succeeded.
- **Icon Files**: Validates icon assets.
- **File Integrity**: Checks that files are properly linked.
- **Extension Completeness**: Validates the extension can be loaded in Chrome.
- **Build Reproducibility**: Ensures consistent build output.

## Framework Configuration

### Playwright

- **Configuration file**: `playwright.config.ts`
- **Documentation**: [Playwright Configuration](https://playwright.dev/docs/test-configuration)

Key settings:
- `testDir`: Specifies the root directory for tests.
- `testMatch`: Defines the pattern for locating E2E test files.
- `reporter`: Configures test reporters, including HTML and GitHub Actions integration.
- `use`: Sets default options for browser behavior, such as tracing and video recording.

### Vitest

- **Configuration file**: `vitest.config.ts`
- **Documentation**: [Vitest Configuration](https://vitest.dev/config/)

Key settings:
- `environment`: Sets the test environment to `jsdom` to simulate a browser environment.
- `include`: Defines the pattern for locating test files.
- `exclude`: Specifies files and directories to ignore.
- `coverage`: Configures code coverage reporting.
