import { Rule } from "./types";
import { matchAndGetTarget, shouldRuleApply } from "./utils.js";
import { getRandomMessage } from "./messages.js";
import { storage } from "./storage.js";

chrome.webNavigation.onBeforeNavigate.addListener(
  async (details: chrome.webNavigation.WebNavigationBaseCallbackDetails) => {
    // Only redirect main frame
    if (details.frameId !== 0) return;

    const rules = await storage.getRules();
    const currentUrl = details.url;

    for (const rule of rules) {
      if (!shouldRuleApply(rule)) continue;

      const target = matchAndGetTarget(currentUrl, rule);

      if (target) {
        // Increment count and update message
        const message = getRandomMessage((rule.count || 0) + 1);
        await storage.incrementCount(rule.id, 1, message);

        // Show badge to indicate redirection (if available)
        showBadge(rule.count);

        chrome.tabs.update(details.tabId, { url: target });
        break; // Stop after first match
      }
    }
  }
);

// Listen for rule changes to immediately redirect open tabs
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.rules) {
    const newRules = (changes.rules.newValue || []) as Rule[];
    const oldRules = (changes.rules.oldValue || []) as Rule[];

    // Find rules that are new or have become active
    const activeRules = newRules.filter((newRule) => {
      const oldRule = oldRules.find((r) => r.id === newRule.id);
      // Rule is new and active OR rule existed but was inactive and is now active
      return (
        (newRule.active && !oldRule) ||
        (newRule.active && oldRule && !oldRule.active)
      );
    });

    if (activeRules.length > 0) {
      chrome.tabs.query({}, async (tabs) => {
        for (const tab of tabs) {
          if (!tab.url || !tab.id) continue;

          for (const rule of activeRules) {
            const target = matchAndGetTarget(tab.url, rule);
            if (target) {
              // Update count safely
              // Since we filtered for "became active", incrementing count won't change "active" state,
              // so it won't trigger this block again.
              const message = getRandomMessage((rule.count || 0) + 1);
              await storage.incrementCount(rule.id, 1, message);

              showBadge((rule.count || 0) + 1);
              chrome.tabs.update(tab.id, { url: target });
              break; // Match first rule
            }
          }
        }
      });
    }
  }
});

function showBadge(count?: number) {
  try {
    if (
      typeof chrome !== "undefined" &&
      chrome.action &&
      chrome.action.setBadgeText
    ) {
      chrome.action.setBadgeText({ text: count ? count.toString() : "✔" });
      chrome.action.setBadgeTextColor({ color: "#ffffff" });
      chrome.action.setBadgeBackgroundColor({ color: "#5f33ffff" });
      // Clear badge after 10 seconds
      setTimeout(() => {
        try {
          if (
            typeof chrome !== "undefined" &&
            chrome.action &&
            chrome.action.setBadgeText
          ) {
            chrome.action.setBadgeText({ text: "" });
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
