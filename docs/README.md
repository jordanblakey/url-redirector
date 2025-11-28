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

### [Testing](testing.md)
Complete guide to the testing architecture.

**Topics covered:**
- Unit, integration, and E2E tests
- Running the test suites
- Build validation tests

**When to read:**
- To understand the project's testing strategy
- Before writing new tests

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

## 🚀 Deployment

### [Releasing](releasing.md)
Instructions for versioning and submitting to the Chrome Web Store.

**Topics covered:**
- Automated release workflow via GitHub Actions
- `npm version` usage
- AI-generated changelogs and store descriptions

**When to read:**
- When preparing to ship a new version

---

## Screenshots

The `screenshots/` directory contains images used in documentation and for the Chrome Web Store listing.

---

_Last updated: 2025-11-21_
