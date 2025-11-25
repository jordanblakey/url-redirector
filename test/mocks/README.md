# Chrome API Mocking Strategy

This directory contains a custom mock for the Chrome Extension API, located in `mock-chrome.ts`. This mock is essential for running our E2E tests in a standard browser environment where the `chrome` global is not otherwise available.

## Why a Custom Mock?

While various libraries exist for mocking the Chrome API (e.g., `sinon-chrome`), we have opted for a lightweight, custom solution for the following reasons:

1.  **Maintenance and Stability**: `sinon-chrome`, the most prominent library in this space, has not been updated since 2018. The Chrome Extension API has evolved significantly since then (e.g., Manifest V3), and an unmaintained library poses a significant risk of being outdated and incompatible. Our custom mock, while not exhaustive, is tailored to the specific needs of this project and can be easily updated as required.

2.  **Simplicity and Transparency**: The current mock is simple to understand and debug. It has no external dependencies and provides clear, straightforward implementations for the API endpoints we use.
