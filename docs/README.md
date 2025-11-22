# Documentation Index

Welcome to the URL Redirector documentation! This directory contains comprehensive guides for developers working on the extension.

## 📚 Development Guides

### [Build Tests](build-tests.md)
Complete guide to the build validation test suite.

**Topics covered:**
- Running build validation tests
- What gets tested (25 different aspects)
- Test categories: Required Files, Compiled JS, Icons, File Integrity, Extension Completeness, Build Reproducibility
- Troubleshooting test failures
- Adding new validation tests

**When to read:** 
- Before modifying the build process
- When adding new files to the extension
- When tests fail in CI

---

### [Build & Bundle Refactoring](build-bundle-refactoring.md)
Analysis of the build and bundle script architecture.

**Topics covered:**
- Why bundle picks up where build leaves off
- Before/after comparison of the refactoring
- Benefits of composition over duplication
- Clear separation of concerns
- Performance improvements

**When to read:**
- To understand the build pipeline
- Before modifying build or bundle scripts
- When optimizing the build process

---

## 🔧 Setup & Configuration

### [Pre-commit Hook](pre-commit-hook.md)
Setting up automated testing before commits.

**Topics covered:**
- Installing the pre-commit hook
- What runs automatically
- Bypassing the hook when needed
- Troubleshooting hook issues

**When to read:**
- During initial project setup
- When contributing to the project
- If commits are being blocked

---

### [Troubleshooting](troubleshooting.md)
Solutions for common development issues.

**Topics covered:**
- Playwright UI mode issues (`EMFILE: too many open files`)
- File descriptor limits on macOS/Linux
- Build failures
- Extension loading issues

**When to read:**
- When encountering errors
- Before asking for help
- When setting up a new development environment

---

## Documentation Naming Convention

All documentation files in this directory follow the **kebab-case** naming convention:
- ✅ `build-tests.md`
- ✅ `pre-commit-hook.md`
- ✅ `troubleshooting.md`
- ❌ ~~`BUILD_TESTS.md`~~
- ❌ ~~`PreCommitHook.md`~~

This convention:
- Makes files easier to type and reference
- Works better in URLs
- Is consistent with modern project standards
- Improves readability

---

## Quick Reference

| Need to... | Read this |
|------------|-----------|
| Understand what the build tests validate | [Build Tests](build-tests.md) |
| Modify the build or bundle process | [Build & Bundle Refactoring](build-bundle-refactoring.md) |
| Set up pre-commit testing | [Pre-commit Hook](pre-commit-hook.md) |
| Fix "too many open files" error | [Troubleshooting](troubleshooting.md) |
| Add a new file to the extension | [Build Tests](build-tests.md) → "Adding New Tests" |
| Create a Web Store package | [Build & Bundle Refactoring](build-bundle-refactoring.md) |

---

## Contributing to Documentation

When adding new documentation:

1. **Use kebab-case** for filenames (e.g., `new-feature-guide.md`)
2. **Add to this index** with a summary and "When to read" section
3. **Link from README.md** in the appropriate category
4. **Include examples** and code snippets where helpful
5. **Keep it up to date** when making related code changes

---

## Screenshots

The `screenshots/` directory contains images used in documentation and for the Chrome Web Store listing. These are not markdown files but are part of the documentation assets.

---

*Last updated: 2025-11-21*
