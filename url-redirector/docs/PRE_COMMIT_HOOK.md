# Pre-commit Hook Setup

## Current Setup

Since the git repository is at `/home/invisible/projects/learn-antigravity` (parent directory), the pre-commit hook is installed at:

```
/home/invisible/projects/learn-antigravity/.git/hooks/pre-commit
```

## How It Works

The hook automatically runs tests for `url-redirector` when you commit changes to files in that directory:

1. Detects if any staged files are in `url-redirector/`
2. If yes, runs `npm test` in the `url-redirector` directory
3. Commit proceeds only if tests pass

## Testing the Hook

Try making a change and committing:

```bash
cd /home/invisible/projects/learn-antigravity/url-redirector
echo "# Test" >> README.md
git add README.md
git commit -m "Test commit"
```

You should see:
```
Running tests for url-redirector...
Running 6 tests using 6 workers
  6 passed (1.0s)
```

## Note on Husky

Husky was installed in `url-redirector/` but won't work because the `.git` directory is at the parent level. The manual git hook approach works better for this monorepo structure.
