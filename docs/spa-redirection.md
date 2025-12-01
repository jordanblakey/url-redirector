# SPA Redirection

## Overview

Single Page Applications (SPAs) often use the HTML5 History API (`pushState`, `replaceState`) to change the URL without triggering a full page reload. Standard browser extensions using `declarativeNetRequest` or `webRequest` APIs typically only intercept network requests, which means they miss these client-side navigation events.

To address this, URL Redirector implements a specialized mechanism to detect and handle SPA navigations.

## How It Works

### 1. Navigation Detection

The extension injects a content script (`src/content-script.ts`) that listens for the `navigate` event provided by the modern [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API). This API allows us to intercept both browser-initiated and client-side navigations.

```typescript
window.navigation.addEventListener('navigate', (event) => {
  // Logic to check destination URL
});
```

### 2. Rule Matching

When a navigation event occurs:

1.  The extension checks the destination URL against the active redirect rules.
2.  It respects the **Paused** state of rules (checking both `active` status and `pausedUntil` timestamp).
3.  It deduplicates rapid navigation events to prevent double-processing.

### 3. Redirection

If a matching rule is found:

1.  The extension manually updates `window.location.href` to the target URL.
2.  This forces a full page load to the new destination.

### 4. Count Synchronization

Since the redirect happens client-side, the content script sends a message (`INCREMENT_COUNT`) to the background script. This ensures that the rule's usage count is incremented correctly, maintaining consistency with standard redirects.

## Why This Is Necessary

Without this mechanism, users navigating within an SPA (e.g., clicking a link in a React or Vue app) would see the URL change in the address bar, but the extension would fail to trigger the redirect because no network request was made for the new document. This feature ensures a seamless experience across all types of websites.
