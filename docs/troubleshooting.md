# Troubleshooting

This document provides solutions to common issues that may arise during development.

## 1. Playwright UI Mode Fails with `EMFILE: too many open files`

### Problem

When running Playwright in UI mode (`npm run test:ui`), you might encounter an `EMFILE: too many open files` error. This happens when the operating system's limit for file watchers is exceeded.

### Solution (Linux)

This issue is common on Linux systems and can be resolved by increasing the `inotify` limits.

#### A. Temporary Fix (Current Session)

To increase the limit for your current session, run:

```bash
sudo sysctl fs.inotify.max_user_instances=512
```

#### B. Permanent Fix

To make the change permanent, add the setting to your system's configuration file:

```bash
echo "fs.inotify.max_user_instances=512" | sudo tee -a /etc/sysctl.conf
```

Then, apply the changes:

```bash
sudo sysctl -p
```

### Verification

You can verify the current limits and usage with the following commands:

```bash
# Check the current limit
cat /proc/sys/fs/inotify/max_user_instances

# Check how many watchers are currently in use
find /proc/*/fd -lname anon_inode:inotify 2>/dev/null | wc -l
```

## 2. Changes Not Appearing in the Extension

### Problem

After making changes to the source code, they don't appear when you test the extension in Chrome.

### Solution

1.  **Rebuild the Project**: Ensure you have run `npm run build` to compile the TypeScript source and copy assets to the `dist/` directory. For continuous development, use `npm run build:watch`.
2.  **Reload the Extension**: Navigate to `chrome://extensions`, find the "URL Redirector" extension, and click the "Reload" button.
3.  **Hard Refresh**: If the changes are on a UI page (like the Options page), do a hard refresh (Ctrl+Shift+R or Cmd+Shift+R) to bypass the cache.

## 3. Pre-commit Hook Fails

### Problem

The pre-commit hook aborts your commit because tests are failing.

### Solution

1.  **Review Test Output**: Carefully read the error messages from the test run to identify the failing test and the cause.
2.  **Run Tests Manually**: Run `npm test` to reproduce the failure and debug the issue.
3.  **Bypass (If Necessary)**: If the changes are not related to code (e.g., documentation updates), you can bypass the hook with the `--no-verify` flag:
    ```bash
    git commit -m "docs: update README" --no-verify
    ```

## 4. Redirects Ignored on PWA Sites (Pinterest, Twitter)

### Problem

Redirect rules fail to trigger on Progressive Web Apps (PWAs) like Pinterest, Twitter, or YouTube. You may also see console logs stating: https://chromewebstore.google.com/detail/redirector/lioaeidejmlpffbndjhaameocfldlhin?hl=en: 🗑️ Unregistering Service Worker for matching rule...

### Cause

These sites use Service Workers to serve content from a local cache ("App Shell"). This bypasses Chrome's network layer, causing the declarativeNetRequest API to be ignored because no network request is made.

### Solution

This behavior is expected. The extension employs a "Service Worker Suppression" system to handle this:

**Automatic Fix**: In the content script, the extension detects the interfering Service Worker, unregisters it, and forces the site to reload via the network. This allows the redirect rule to fire on the next attempt.

**Console Logs**: The "Unregistering" logs indicate the extension is successfully removing the cache layer to enforce your rules.

**Manual Reset**: If a site is persistently refusing to redirect, open Developer Tools (F12) > Application > Storage and click "Clear site data".
