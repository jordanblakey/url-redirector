# Pre-commit Hook Setup

## Overview

A pre-commit hook is available to automatically run tests before every commit. This ensures that broken code is never committed to the repository.

## Setup

Since the repository root contains the `.git` directory, you can install the pre-commit hook by copying the provided script to your git hooks directory.

### Installation

1.  Ensure you are in the root of the repository.
2.  Make the hook executable and copy it:

    ```bash
    chmod +x .husky/pre-commit
    cp .husky/pre-commit .git/hooks/pre-commit
    ```

    *(Note: If you are using a newer version of git or a different hook manager, adjust the path accordingly. The standard git hook path is `.git/hooks/pre-commit`)*

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
