// Remove url_redirector param - this is how we hear the Declarative Net Request redirect
// We do this in a content script to avoid needing the "scripting" permission
if (window.location.search.includes('url_redirector=')) {
  const url = new URL(window.location.href);
  const source = url.searchParams.get('url_redirector');

  // 1. Cleanup URL immediately to avoid visual clutter
  url.searchParams.delete('url_redirector');
  window.history.replaceState(null, '', url.toString());

  // 2. Notify background script to update count
  if (source) {
    try {
      chrome.runtime
        .sendMessage({
          type: 'REDIRECT_DETECTED',
          source: source,
        })
        .catch(() => {
          // Ignore errors if background script is not ready
          // This can happen if the extension was just reloaded
        });
    } catch (_e) {
      // Ignore errors
    }
  }
}
