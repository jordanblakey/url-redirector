console.debug('[URL Redirector]: ✅ Content script loaded!');

// Remove url_redirector param - this is how we hear the Declarative Net Request redirect
// We do this in a content script to avoid needing the "scripting" permission
if (window.location.search.includes('url_redirector=')) {
  const url = new URL(window.location.href);

  // 1. Cleanup URL immediately to avoid visual clutter
  url.searchParams.delete('url_redirector');
  window.history.replaceState(null, '', url.toString());
}

chrome.storage.local.get(['rules'], (result) => {
  const rules: Rule[] = Array.isArray(result.rules) ? result.rules : [];
  if (rules.length === 0) return;

  const currentUrl = window.location.href;
  const hasMatchingRule = checkHasMatchingRule(rules, currentUrl);
  if (hasMatchingRule) {
    console.debug('[URL Redirector]: ⚠️ This page has a URL Redirector rule!');
    console.log(
      '[URL Redirector]: 🧿 Monitoring for Service Workers that could interfere with redirect rules...',
    );
  }

  // Check if we need to unregister Service Workers
  // We do this for any site that has a rule, even if paused.
  // This prevents SWs from interfering with Declarative Net Request redirects.
  if ('serviceWorker' in navigator) {
    console.debug('[URL Redirector]: ✅ navigator.serviceWorker exists!');
    if (navigator.serviceWorker.controller) {
      console.debug('[URL Redirector]: ⚠️ This page is controlled by a Service Worker.');
      console.debug(
        '[URL Redirector]: SW Script URL:',
        navigator.serviceWorker.controller.scriptURL,
      );
      if (hasMatchingRule) {
        unregisterServiceWorkers();
      }
    } else {
      console.debug(
        '[URL Redirector]: ✅ No Service Worker controls this page (Pure Network/HTTP Cache).',
      );
    }
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.debug('[URL Redirector]: ⚠️ Service Worker just took control!');
      if (hasMatchingRule) {
        unregisterServiceWorkers();
      }
    });

    if (hasMatchingRule) {
      setInterval(() => {
        console.debug('[URL Redirector]: ♻️ Polling for service new worker registration...');
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          if (registrations.length > 0) {
            console.debug(
              '[URL Redirector]: ⚠️ Found',
              registrations.length,
              'new service worker registrations!',
            );
            unregisterServiceWorkers();
          }
        });
      }, 5000);
    }
  }
});

// Handle SPA navigations (history.pushState, etc.)
// The Navigation API is available in Chrome 102+
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if ((window as any).navigation) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).navigation.addEventListener('navigate', (event: any) => {
    const destinationUrl = event.destination.url;
    console.debug('[URL Redirector]: 🧭 Navigation detected to:', destinationUrl);
    checkMatchingRuleAndRedirect(destinationUrl);
  });
}

function checkMatchingRuleAndRedirect(destinationUrl: string): void {
  chrome.storage.local.get(['rules'], (result) => {
    const rules: Rule[] = Array.isArray(result.rules) ? result.rules : [];
    if (rules.length === 0) return;
    // Check if the new URL matches any rules
    // We need to check this synchronously if possible, or cancel the navigation and redirect
    // But for now, let's just check and redirect if needed.
    // Note: This might cause a flash of the new content if we don't intercept.
    // Intercepting requires event.intercept(), but let's start with simple redirect.

    // Find the matching rule to get the target
    const matchingRule = rules.find((r) => {
      const currentUrlNormalized = normalizeUrl(destinationUrl);
      const sourceNormalized = normalizeUrl(r.source);
      return currentUrlNormalized.startsWith(sourceNormalized);
    });

    if (matchingRule) {
      // Check if rule is paused
      console.log('[URL Redirector]: 🎯 Matching rule found for SPA navigation:', matchingRule);
      if (matchingRule.pausedUntil && matchingRule.pausedUntil > Date.now()) {
        console.log('[URL Redirector]: ⏸️ Rule is paused, skipping SPA redirect');
        return;
      }

      console.log('[URL Redirector]: 🔀 Redirecting to:', matchingRule.target);
      // We can't easily use the DNR redirect logic here because that happens in background.
      // So we manually redirect using window.location.
      // Ideally, we should let the background script handle it, but for SPA,
      // the request might not go to the network in a way DNR catches it (if it's purely client-side).

      // However, simply setting window.location.href will trigger a full page load,
      // which WILL be caught by DNR if we let it happen.
      // But if we want to be faster or handle it internally:
      let target = matchingRule.target;
      if (!target.startsWith('http')) {
        target = `https://${target}`;
      }

      // Prevent the SPA navigation from completing if possible, or just override it.
      // If we just set window.location.href, it should work.
      window.location.href = target;
    }
  });
}

function unregisterServiceWorkers(): void {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      console.log(
        '[URL Redirector]: 🗑️ Unregistering service worker for matching rule:',
        registration.scope,
      );
      registration.unregister();
    }
  });
}

// Types needed for rule matching
interface Rule {
  id: number;
  source: string;
  target: string;
  count: number;
  active: boolean;
  pausedUntil?: number;
  lastCountMessage?: string;
}

function normalizeUrl(url: string): string {
  let normalized = url.toLowerCase();
  normalized = normalized.replace(/^https?:\/\//, '');
  normalized = normalized.replace(/^www\./, '');
  return normalized;
}

function checkHasMatchingRule(rules: Rule[], url: string): boolean {
  const currentUrlNormalized = normalizeUrl(url);
  return rules.some((rule) => {
    const sourceNormalized = normalizeUrl(rule.source);
    const isMatch = currentUrlNormalized.startsWith(sourceNormalized);
    return isMatch;
  });
}
