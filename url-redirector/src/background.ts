import { Rule } from './types.js';

chrome.webNavigation.onBeforeNavigate.addListener(
    (details: chrome.webNavigation.WebNavigationBaseCallbackDetails) => {
        // Only redirect main frame
        if (details.frameId !== 0) return;

        chrome.storage.local.get(['rules'], (result) => {
            const rules = (result.rules as Rule[]) || [];
            const currentUrl = details.url;

            for (const rule of rules) {
                // Normalize URLs for comparison
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
    }
);
