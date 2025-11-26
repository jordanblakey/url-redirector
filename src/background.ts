import { Rule } from "./types";
import { matchAndGetTarget, shouldRuleApply, generateRuleId } from "./utils.js";
import { getRandomMessage } from "./messages.js";
import { storage } from "./storage.js";
import { getRandomProductiveUrl } from "./suggestions.js";

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
    const activeRules = newRules.filter((newRule) => {
      const oldRule = oldRules.find((r) => r.id === newRule.id);
      const isNowActive = shouldRuleApply(newRule);
      const wasActive = oldRule ? shouldRuleApply(oldRule) : false;
      return isNowActive && !wasActive;
    });

    if (activeRules.length > 0) {
      await scanAndRedirect(activeRules);
    }
  }
});

async function updateDynamicRules() {
  const rules = await storage.getRules();
  const dnrRules: chrome.declarativeNetRequest.Rule[] = [];

  for (const rule of rules) {
    if (!shouldRuleApply(rule)) continue;

    let target = rule.target;
    if (target === ':shuffle:') {
      target = getRandomProductiveUrl();
    }

    const id = generateRuleId(rule.source);

    // Normalize source for DNR
    // rule.source might be "example.com" or "example.com/foo"
    // We strip protocol and www for the filter
    let source = rule.source.toLowerCase();
    source = source.replace(/^https?:\/\//, '');
    source = source.replace(/^www\./, '');

    const dnrRule: chrome.declarativeNetRequest.Rule = {
      id: id,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
        redirect: {
          url: target.startsWith('http') ? target : `https://${target}`
        }
      },
      condition: {
        urlFilter: `||${source}`,
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME]
      }
    };

    dnrRules.push(dnrRule);
  }

  const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
  const oldRuleIds = oldRules.map(r => r.id);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: oldRuleIds,
    addRules: dnrRules
  });
}

async function scanAndRedirect(activeRules: Rule[]) {
  // The Sweeper: Redirect currently open tabs
  const tabs = await chrome.tabs.query({});

  for (const tab of tabs) {
    if (!tab.url || !tab.id) continue;

    for (const rule of activeRules) {
      // matchAndGetTarget handles :shuffle: dynamically
      const target = matchAndGetTarget(tab.url, rule);
      if (target) {
        chrome.tabs.update(tab.id, { url: target });

        // Increment count for sweeper hits
        const message = getRandomMessage((rule.count || 0) + 1);
        await storage.incrementCount(rule.id, 1, message);

        showBadge(rule.count + 1);
        break;
      }
    }
  }
}

function showBadge(count?: number) {
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
