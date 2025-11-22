import { Rule } from './types.js';
import { matchAndGetTarget } from './utils.js';

chrome.webNavigation.onBeforeNavigate.addListener(
    (details: chrome.webNavigation.WebNavigationBaseCallbackDetails) => {

        // Only redirect main frame
        if (details.frameId !== 0) return;

        chrome.storage.local.get(['rules'], (result) => {
            const rules = (result.rules as Rule[]) || [];
            const currentUrl = details.url;

            for (const rule of rules) {
                const target = matchAndGetTarget(currentUrl, rule);

                if (target) {
                    rule.count = (rule.count || 0) + 1;
                    chrome.storage.local.set({ rules });

                    // Show badge to indicate redirection (if available)
                    try {
                        if (typeof chrome !== 'undefined' && chrome.action && chrome.action.setBadgeText) {
                            chrome.action.setBadgeText({ text: '✔' });
                            chrome.action.setBadgeTextColor({ color: '#ffffff' });
                            chrome.action.setBadgeBackgroundColor({ color: '#5f33ffff' });
                            // Clear badge after 10 seconds
                            setTimeout(() => {
                                try {
                                    if (typeof chrome !== 'undefined' && chrome.action && chrome.action.setBadgeText) {
                                        chrome.action.setBadgeText({ text: '' });
                                    }
                                } catch (e) {
                                    // Silently fail if action API not available
                                }
                            }, 10000);
                        }
                    } catch (e) {
                        // Silently fail if action API not available
                    }

                    chrome.tabs.update(details.tabId, { url: target });
                    break; // Stop after first match
                }
            }
        });
    }
);
