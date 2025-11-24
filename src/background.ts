import { Rule, StorageResult } from './types';
import { matchAndGetTarget, shouldRuleApply } from './utils.js';
import { getRules, saveRules } from './storage.js';
import { getRandomMessage } from './messages.js';

chrome.webNavigation.onBeforeNavigate.addListener(
    (details: chrome.webNavigation.WebNavigationBaseCallbackDetails) => {

        // Only redirect main frame
        if (details.frameId !== 0) return;

        getRules().then((rules) => {
            const currentUrl = details.url;

            for (const rule of rules) {
                if (!shouldRuleApply(rule)) continue;

                const target = matchAndGetTarget(currentUrl, rule);

                if (target) {
                    rule.count = (rule.count || 0) + 1;
                    rule.lastCountMessage = getRandomMessage(rule.count);
                    saveRules(rules); // We don't await this to avoid blocking redirect

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
                            // Update count for the rule
                            // We re-fetch rules to ensure we have the latest state and don't overwrite concurrent updates
                            getRules().then((currentRules) => {
                                const ruleToUpdate = currentRules.find(r => r.id === rule.id);
                                if (ruleToUpdate) {
                                    ruleToUpdate.count = (ruleToUpdate.count || 0) + 1;
                                    ruleToUpdate.lastCountMessage = getRandomMessage(ruleToUpdate.count);
                                    saveRules(currentRules);
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
