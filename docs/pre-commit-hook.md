# Pre-commit Hook Setup

## Overview

A pre-commit hook is available to automatically run tests before every commit. This ensures that broken code is never committed to the repository.

## Setup

This project uses [husky](https://typicode.github.io/husky/) to manage Git hooks. The pre-commit hook is configured in `.husky/pre-commit` and is automatically installed when you run `npm install`.

### Installation

To ensure the hooks are set up, simply run:

```bash
npm install
```

This will configure Git to use the hooks defined in the `.husky/` directory.

## How It Works

The hook:

1.  Checks if you are committing changes.
2.  Runs `npm test` (which executes Playwright tests).
3.  **Pass**: If tests pass, the commit proceeds.
4.  **Fail**: If tests fail, the commit is aborted, allowing you to fix the issues.

## Bypassing the Hook

If you need to commit without running tests (e.g., for documentation updates only, or WIP commits), you can use the `--no-verify` flag:

```bash
git commit -m "WIP: saving work" --no-verify
```
