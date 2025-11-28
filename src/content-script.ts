// Remove url_redirector param - this is how we hear the Declarative Net Request redirect
// We do this in a content script to avoid needing the "scripting" permission
if (window.location.search.includes('url_redirector=')) {
    const url = new URL(window.location.href);
    const source = url.searchParams.get('url_redirector');

    // Notify background script to update count
    if (source) {
        chrome.runtime.sendMessage({
            type: 'REDIRECT_DETECTED',
            source: source
        });
    }

    url.searchParams.delete('url_redirector');
    window.history.replaceState(null, '', url.toString());
}
