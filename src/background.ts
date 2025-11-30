import { Rule } from './types';
import { buildDNRRules, findActivelyChangedRules, findMatchingTabs } from './background-logic.js';
import { generateRuleId } from './utils.js';
import { getRandomMessage } from './messages.js';
import { storage } from './storage.js';

// Expose for testing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(self as any).storage = storage;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(self as any).setForceLocalStorage = (value: boolean) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any).FORCE_LOCAL_STORAGE = value;
};

let rulesMap: Map<number, Rule> | null = null;
const processedRedirects: Map<number, Set<number>> = new Map();

async function ensureRulesMap(rules?: Rule[]) {
  if (rulesMap && !rules) return;

  const currentRules = rules || (await storage.getRules());
  rulesMap = new Map();
  for (const rule of currentRules) {
    rulesMap.set(generateRuleId(rule.source), rule);
  }
}

// Initialize rules on load
chrome.runtime.onInstalled.addListener(async () => {
  await updateDynamicRules();
});

chrome.runtime.onStartup.addListener(async () => {
  await updateDynamicRules();
});

// Listen for redirect messages from content script
// Listen for redirect detected via URL param (works even if content script fails)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // 1. Detect Redirect (Early) - for Badge & Count
  if (changeInfo.url && changeInfo.url.includes('url_redirector=')) {
    const url = new URL(changeInfo.url);
    const source = url.searchParams.get('url_redirector');

    if (source) {
      await ensureRulesMap();
      if (!processedRedirects.has(tabId)) {
        processedRedirects.set(tabId, new Set());
      }
      const processed = processedRedirects.get(tabId)!;
      const ids = source.split(',').map((s) => parseInt(s, 10));

      for (const id of ids) {
        if (isNaN(id) || processed.has(id)) continue;

        const rule = rulesMap?.get(id);
        if (rule) {
          if (rule.target === ':shuffle:') {
            console.debug('Shuffle rule hit, re-rolling target...');
            // Catch errors to avoid crashing if rate limited
            updateDynamicRules().catch((e: unknown) =>
              console.error('Failed to update shuffle rule:', e),
            );
          }
          const countMessage = getRandomMessage(rule.count + 1);
          await storage.incrementCount(rule.id, 1, countMessage);
          showBadge(rule.count + 1);
          processed.add(id);
        }
      }
    }
  }

  // 2. Detect Failed Cleanup (Late) - for URL Cleanup
  // If content script didn't run (e.g. error page), clean up here
  if (changeInfo.status === 'complete') {
    if (tab.url && tab.url.includes('url_redirector=')) {
      const url = new URL(tab.url);
      url.searchParams.delete('url_redirector');
      chrome.tabs.update(tabId, { url: url.toString() });
    }
    processedRedirects.delete(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  processedRedirects.delete(tabId);
});

// Listen for messages from popup or options page
chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type === 'RULES_UPDATED') {
    console.debug('Rules updated, re-evaluating DNR rules...');
    const rules = await storage.getRules();
    await updateDynamicRules(rules);
    const activeRules = rules.filter((r) => r.active);
    if (activeRules.length > 0) {
      await scanAndRedirect(activeRules);
    }
  }
});

// Listen for rule changes
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  // Check if we should process this change based on storage mode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const useLocal = (self as any).FORCE_LOCAL_STORAGE;
  const isValidArea = (areaName === 'sync' && !useLocal) || (areaName === 'local' && useLocal);

  if (isValidArea && changes.rules) {
    const newRules = (changes.rules.newValue || []) as Rule[];
    const oldRules = (changes.rules.oldValue || []) as Rule[];

    // Update cache
    await ensureRulesMap(newRules);

    // Check if we need to update DNR rules
    // We only update if source, target, or active status changed, or if rules were added/removed
    const hasLogicChanged =
      JSON.stringify(
        newRules.map((r) => ({ s: r.source, t: r.target, a: r.active, p: r.pausedUntil })),
      ) !==
      JSON.stringify(
        oldRules.map((r) => ({ s: r.source, t: r.target, a: r.active, p: r.pausedUntil })),
      );

    if (hasLogicChanged) {
      console.debug('Rules logic changed, updating DNR rules...');
      await updateDynamicRules(newRules);
    } else {
      console.debug('Only counts changed, skipping DNR update.');
    }

    // Find rules that are new or have become active
    const activeRules = findActivelyChangedRules(newRules, oldRules);

    if (activeRules.length > 0) {
      await scanAndRedirect(activeRules);
    }
  }
});

export async function updateDynamicRules(rules?: Rule[]) {
  await ensureRulesMap(rules);
  if (!rules) {
    rules = await storage.getRules();
  }
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
