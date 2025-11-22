import { Rule, StorageResult } from './types.js';
import { matchAndGetTarget } from './utils.js';

chrome.webNavigation.onBeforeNavigate.addListener(
    (details: chrome.webNavigation.WebNavigationBaseCallbackDetails) => {

        // Only redirect main frame
        if (details.frameId !== 0) return;

        chrome.storage.local.get(['rules'], (result: StorageResult) => {
            const rules = result.rules || [];
            const currentUrl = details.url;

            for (const rule of rules) {
                if (rule.active === false) continue;
                const target = matchAndGetTarget(currentUrl, rule);

                if (target) {
                    rule.count = (rule.count || 0) + 1;
                    chrome.storage.local.set({ rules });

                    // Show badge to indicate redirection (if available)
                    showBadge();

                    chrome.tabs.update(details.tabId, { url: target });
                    break; // Stop after first match
                }
            }
        });
    }
);

// Listen for rule changes to immediately redirect open tabs
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.rules) {
        const newRules = (changes.rules.newValue || []) as Rule[];
        const oldRules = (changes.rules.oldValue || []) as Rule[];

        // Find rules that are new or have become active
        const activeRules = newRules.filter(newRule => {
            const oldRule = oldRules.find(r => r.id === newRule.id);
            // Rule is new and active OR rule existed but was inactive and is now active
            return (newRule.active && !oldRule) || (newRule.active && oldRule && !oldRule.active);
        });

        if (activeRules.length > 0) {
            chrome.tabs.query({}, (tabs) => {
                for (const tab of tabs) {
                    if (!tab.url || !tab.id) continue;

                    for (const rule of activeRules) {
                        const target = matchAndGetTarget(tab.url, rule);
                        if (target) {
                            // Update count
                            // Note: This might cause a race condition if multiple tabs match, 
                            // but for now we'll just increment. 
                            // Ideally we should re-fetch rules, increment, and save, but we are inside the change listener.
                            // To avoid infinite loops or complexity, we might skip incrementing count here 
                            // OR we accept that we might need to do another get/set.
                            // For simplicity and to avoid loop (set triggers onChanged), let's just redirect.
                            // If we want to count, we should do it carefully.
                            // Let's try to increment count.

                            chrome.storage.local.get(['rules'], (result) => {
                                const currentRules = (result.rules as Rule[]) || [];
                                const ruleToUpdate = currentRules.find(r => r.id === rule.id);
                                if (ruleToUpdate) {
                                    ruleToUpdate.count = (ruleToUpdate.count || 0) + 1;
                                    // We need to be careful not to trigger this listener again in a way that causes loop.
                                    // But since we filter for "became active", incrementing count won't change "active" state,
                                    // so it shouldn't trigger this block again.
                                    chrome.storage.local.set({ rules: currentRules });
                                }
                            });

                            showBadge();
                            chrome.tabs.update(tab.id, { url: target });
                            break; // Match first rule
                        }
                    }
                }
            });
        }
    }
});

function showBadge() {
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
}
