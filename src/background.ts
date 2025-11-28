import { Rule } from "./types";
import { buildDNRRules, findActivelyChangedRules, findMatchingTabs } from "./background-logic.js";
import { normalizeUrl } from "./utils.js";
import { getRandomMessage } from "./messages.js";
import { storage } from "./storage.js";

// Initialize rules on load
chrome.runtime.onInstalled.addListener(async () => {
  await updateDynamicRules();
});

chrome.runtime.onStartup.addListener(async () => {
  await updateDynamicRules();
});

// Listen for redirect messages from content script
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'REDIRECT_DETECTED' && message.source) {
    const activeRules = await storage.getRules();
    const source = message.source;

    for (const rule of activeRules) {
      // Normalize both to ensure they match
      if (source === normalizeUrl(rule.source)) {
        const countMessage = getRandomMessage(rule.count + 1);
        await storage.incrementCount(rule.id, 1, countMessage);
        showBadge(rule.count + 1);
        break;
      }
    }
  }
});

// Keep onUpdated for debugging or fallback, but the message is primary now.
// Actually, let's remove the conflicting logic to avoid double counting if both fire.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only logging for now
  if (changeInfo.status === "loading" && changeInfo.url) {
    const url = new URL(changeInfo.url);
    if (url.searchParams.has("url_redirector")) {
      // console.log("Background saw url_redirector param via onUpdated");
    }
  }
});

// Listen for rule changes
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === "local" && changes.rules) {
    const newRules = (changes.rules.newValue || []) as Rule[];
    const oldRules = (changes.rules.oldValue || []) as Rule[];

    // Check if we need to update DNR rules
    // We only update if source, target, or active status changed, or if rules were added/removed
    const hasLogicChanged = JSON.stringify(newRules.map(r => ({ s: r.source, t: r.target, a: r.active }))) !==
      JSON.stringify(oldRules.map(r => ({ s: r.source, t: r.target, a: r.active })));

    if (hasLogicChanged) {
      console.log("Rules logic changed, updating DNR rules...");
      await updateDynamicRules();
    } else {
      console.log("Only counts changed, skipping DNR update.");
    }

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
  console.log("showBadge called with:", count);
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
          console.error("Error clearing badge:", e);
        }
      }, 10000);
    }
  } catch (e) {
    console.error("Error showing badge:", e);
  }
}
