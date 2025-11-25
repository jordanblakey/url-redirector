# Documentation Index

Welcome to the URL Redirector documentation! This directory contains comprehensive guides for developers working on the extension.

## 📚 Development Guides

### [Build System](build-system.md)
Overview of the build and bundle architecture.

**Topics covered:**
- How `build` and `bundle` scripts work together
- The role of the `dist/` directory
- Release packaging workflow

**When to read:**
- Before modifying build scripts
- To understand how the extension is packaged

---

### [Build Tests](build-tests.md)
Complete guide to the build validation test suite.

**Topics covered:**
- Running build validation tests (`npm run test:build`)
- What gets tested (25 different aspects)
- Troubleshooting build failures

**When to read:**
- Before modifying the build process
- When tests fail in CI
- When adding new files to the extension

---

## 🧪 Testing

### [Mocking Strategy](mocking-strategy.md)
Explanation of the custom Chrome API mocking strategy.

**Topics covered:**
- Why a custom mock is used
- Integrating `sinon` for assertions

**When to read:**
- Before writing or modifying tests
- To understand how E2E tests work in a browser environment

---

## 🔧 Setup & Configuration

### [Pre-commit Hook](pre-commit-hook.md)
Setting up automated testing before commits.

**Topics covered:**
- Installation instructions
- Bypassing the hook
- How it works

**When to read:**
- During initial project setup
- If you want to automate testing

---

### [Troubleshooting](troubleshooting.md)
Solutions for common development issues.

**Topics covered:**
- Playwright UI mode issues (`EMFILE: too many open files`)
- File descriptor limits

**When to read:**
- When encountering specific errors listed in the guide

---

## Screenshots

The `screenshots/` directory contains images used in documentation and for the Chrome Web Store listing.

---

*Last updated: 2025-11-21*
