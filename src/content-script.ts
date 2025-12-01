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

// Track URLs currently being processed to prevent double counting/redirects
const processingUrls = new Set<string>();

// Handle SPA navigations (history.pushState, etc.)
// The Navigation API is available in Chrome 102+
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if ((window as any).navigation) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).navigation.addEventListener('navigate', (event: any) => {
    const destinationUrl = event.destination.url;

    // Deduplicate: If we are already checking/redirecting this URL, ignore
    if (processingUrls.has(destinationUrl)) {
      console.debug('[URL Redirector]: 🛑 Already processing navigation to:', destinationUrl);
      return;
    }

    console.debug('[URL Redirector]: 🧭 Navigation detected to:', destinationUrl);
    processingUrls.add(destinationUrl);

    // Safety cleanup: Remove from set after a few seconds in case redirect fails or page doesn't unload
    setTimeout(() => {
      processingUrls.delete(destinationUrl);
    }, 2000);

    checkMatchingRuleAndRedirect(destinationUrl);
  });
}

function checkMatchingRuleAndRedirect(destinationUrl: string): void {
  chrome.storage.local.get(['rules'], (result) => {
    const rules: Rule[] = Array.isArray(result.rules) ? result.rules : [];
    if (rules.length === 0) {
      processingUrls.delete(destinationUrl);
      return;
    }
    // Check if the new URL matches any rules

    // Find the matching rule to get the target
    const matchingRule = rules.find((r) => {
      const currentUrlNormalized = normalizeUrl(destinationUrl);
      const sourceNormalized = normalizeUrl(r.source);
      return currentUrlNormalized.startsWith(sourceNormalized);
    });

    if (matchingRule) {
      // Check if rule is paused
      if (matchingRule.pausedUntil && matchingRule.pausedUntil > Date.now()) {
        console.log('[URL Redirector]: ⏸️ Rule is paused, skipping SPA redirect');
        processingUrls.delete(destinationUrl);
        return;
      }

      console.log('[URL Redirector]: 🔀 Redirecting to:', matchingRule.target);

      // Manually redirect using window.location.
      // This ensures the redirect happens even if DNR doesn't catch the client-side request.
      let target = matchingRule.target;
      if (!target.startsWith('http')) {
        target = `https://${target}`;
      }

      // Increment count
      chrome.runtime.sendMessage({ type: 'INCREMENT_COUNT', ruleId: matchingRule.id });

      // Prevent the SPA navigation from completing if possible, or just override it.
      // If we just set window.location.href, it should work.
      window.location.href = target;
    } else {
      // No match found
      processingUrls.delete(destinationUrl);
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
