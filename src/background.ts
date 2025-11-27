import { Rule } from "./types";
import { buildDNRRules, findActivelyChangedRules, findMatchingTabs } from "./background-logic.js";
import { getRandomMessage } from "./messages.js";
import { storage } from "./storage.js";

// Initialize rules on load
chrome.runtime.onInstalled.addListener(async () => {
  await updateDynamicRules();
});

chrome.runtime.onStartup.addListener(async () => {
  await updateDynamicRules();
});

// Listen for rule changes
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === "local" && changes.rules) {
    await updateDynamicRules();

    const newRules = (changes.rules.newValue || []) as Rule[];
    const oldRules = (changes.rules.oldValue || []) as Rule[];

    // Find rules that are new or have become active
    const activeRules = findActivelyChangedRules(newRules, oldRules);

    if (activeRules.length > 0) {
      await scanAndRedirect(activeRules);
    }
  }
});

export async function updateDynamicRules() {
  const rules = await storage.getRules();
  const dnrRules = buildDNRRules(rules);

  const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
  const oldRuleIds = oldRules.map(r => r.id);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: oldRuleIds,
    addRules: dnrRules
  });
}

export async function scanAndRedirect(activeRules: Rule[]) {
  // The Sweeper: Redirect currently open tabs
  const tabs = await chrome.tabs.query({});
  const redirects = findMatchingTabs(tabs, activeRules);

  for (const redirect of redirects) {
    chrome.tabs.update(redirect.tabId, { url: redirect.targetUrl });

    // Increment count for sweeper hits
    const message = getRandomMessage(redirect.ruleCount + 1);
    await storage.incrementCount(redirect.ruleId, 1, message);

    showBadge(redirect.ruleCount + 1);
  }
}

export function showBadge(count?: number) {
  try {
    if (
      typeof chrome !== "undefined" &&
      chrome.action &&
      chrome.action.setBadgeText
    ) {
      chrome.action.setBadgeText({
        text: count ? count.toString() : "✔",
      });
      chrome.action.setBadgeTextColor({ color: "#ffffff" });
      chrome.action.setBadgeBackgroundColor({ color: "#5f33ffff" });
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
          // Silently fail
        }
      }, 10000);
    }
  } catch (e) {
    // Silently fail
  }
}
