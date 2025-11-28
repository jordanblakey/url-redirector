import { Rule, RedirectMessage } from './types';
import { buildDNRRules, findActivelyChangedRules, findMatchingTabs } from './background-logic.js';
import { normalizeUrl } from './utils.js';
import { getRandomMessage } from './messages.js';
import { storage } from './storage.js';

// Initialize rules on load
chrome.runtime.onInstalled.addListener(async () => {
  await updateDynamicRules();
});

chrome.runtime.onStartup.addListener(async () => {
  await updateDynamicRules();
});

// Listen for redirect messages from content script
// eslint-disable-next-line @typescript-eslint/no-explicit-any
chrome.runtime.onMessage.addListener(
  async (message: RedirectMessage, _sender, _sendResponse: (response?: any) => void) => {
    if (message.type === 'REDIRECT_DETECTED' && message.source) {
      const activeRules = await storage.getRules();
      const source = message.source;

      for (const rule of activeRules) {
        // Normalize both to ensure they match
        if (source === normalizeUrl(rule.source)) {
          if (rule.target === ':shuffle:') {
            console.log('Shuffle rule hit, re-rolling target...');
            // Catch errors to avoid crashing if rate limited
            updateDynamicRules().catch((e: unknown) =>
              console.error('Failed to update shuffle rule:', e),
            );
          }
          const countMessage = getRandomMessage(rule.count + 1);
          await storage.incrementCount(rule.id, 1, countMessage);
          showBadge(rule.count + 1);
          break;
        }
      }
    }
  },
);

// Listen for rule changes
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'local' && changes.rules) {
    const newRules = (changes.rules.newValue || []) as Rule[];
    const oldRules = (changes.rules.oldValue || []) as Rule[];

    // Check if we need to update DNR rules
    // We only update if source, target, or active status changed, or if rules were added/removed
    const hasLogicChanged =
      JSON.stringify(newRules.map((r) => ({ s: r.source, t: r.target, a: r.active }))) !==
      JSON.stringify(oldRules.map((r) => ({ s: r.source, t: r.target, a: r.active })));

    if (hasLogicChanged) {
      console.log('Rules logic changed, updating DNR rules...');
      await updateDynamicRules();
    } else {
      console.log('Only counts changed, skipping DNR update.');
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
  const oldRuleIds = oldRules.map((r) => r.id);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: oldRuleIds,
    addRules: dnrRules,
  });
}

export async function scanAndRedirect(activeRules: Rule[]) {
  // The Sweeper: Redirect currently open tabs
  const tabs = await chrome.tabs.query({});
  const redirects = findMatchingTabs(tabs, activeRules);

  // Group redirects by rule ID to batch count updates
  const ruleUpdates = new Map<number, number>();

  for (const redirect of redirects) {
    chrome.tabs.update(redirect.tabId, { url: redirect.targetUrl });

    const currentCount = ruleUpdates.get(redirect.ruleId) || 0;
    ruleUpdates.set(redirect.ruleId, currentCount + 1);
  }

  // Perform batched updates
  for (const [ruleId, incrementBy] of ruleUpdates.entries()) {
    // We need to get the current count to generate a message
    // Since we are batching, we'll just use the final count for the message
    const rules = await storage.getRules();
    const rule = rules.find((r) => r.id === ruleId);

    if (rule) {
      const newCount = (rule.count || 0) + incrementBy;
      const message = getRandomMessage(newCount);
      await storage.incrementCount(ruleId, incrementBy, message);
      showBadge(newCount);
    }
  }
}

export function showBadge(count?: number) {
  try {
    if (typeof chrome !== 'undefined' && chrome.action && chrome.action.setBadgeText) {
      chrome.action.setBadgeText({
        text: count ? count.toString() : '✔',
      });
      chrome.action.setBadgeTextColor({ color: '#ffffff' });
      chrome.action.setBadgeBackgroundColor({ color: '#5f33ffff' });
      setTimeout(() => {
        try {
          if (typeof chrome !== 'undefined' && chrome.action && chrome.action.setBadgeText) {
            chrome.action.setBadgeText({ text: '' });
          }
        } catch (_e: unknown) {
          // Silently fail
        }
      }, 10000);
    }
  } catch (_e: unknown) {
    // Silently fail
  }
}
