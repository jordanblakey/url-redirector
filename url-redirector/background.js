chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    console.log("onBeforeNavigate");
    console.log(details);
    console.log(details.url);
    // Only redirect main frame
    if (details.frameId !== 0) return;

    chrome.storage.local.get(['rules'], (result) => {
        const rules = result.rules || [];
        const currentUrl = details.url;

        for (const rule of rules) {
            // Normalize URLs for comparison (remove protocol if user didn't add it, etc.)
            // For simplicity, we'll check if the current URL *contains* the source string
            // or if the user provided a more specific match.

            // A robust implementation might parse URLs, but for "simple", we'll do a basic check.
            // We want "source" and "any sub page" to redirect.

            // Let's clean up the source to ensure we match correctly.
            // If user enters "example.com", we match "http://example.com", "https://example.com", "https://example.com/foo"

            let source = rule.source.toLowerCase();
            // Remove protocol
            source = source.replace(/^https?:\/\//, '');
            // Remove www.
            source = source.replace(/^www\./, '');

            const currentUrlLower = currentUrl.toLowerCase();
            // Remove protocol
            let currentUrlClean = currentUrlLower.replace(/^https?:\/\//, '');
            // Remove www.
            currentUrlClean = currentUrlClean.replace(/^www\./, '');

            // Check if it starts with the source
            if (currentUrlClean.startsWith(source)) {
                // It's a match! Redirect.
                // We need to decide if we just redirect to the target root, or preserve the path?
                // The prompt says "redirect to a second url the user inputs". 
                // It implies a hard redirect to that specific target URL, not a path rewrite.
                // "that page and any sub page will redirect to a second url" -> implies all go to the single target.

                let target = rule.target;
                if (!target.startsWith('http')) {
                    target = 'https://' + target;
                }

                // Avoid infinite redirect loops if target is same as source
                if (currentUrl.includes(target)) return;

                chrome.tabs.update(details.tabId, { url: target });
                break; // Stop after first match
            }
        }
    });
});
