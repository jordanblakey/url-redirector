import { Rule } from './types';
import { buildDNRRules, findActivelyChangedRules, findMatchingTabs } from './background-logic.js';
import { generateRuleId } from './utils.js';
import { getRandomMessage } from './messages.js';
import { storage } from './storage.js';

let rulesMap: Map<number, Rule> | null = null;
const ALARM_NAME = 'flush_stats';
const FLUSH_INTERVAL_MIN = 1 / 12; // 5 seconds (1/12 of a minute)

// In-memory buffer for stats (Requirement: "increment a temp_buffer variable in memory")
const temp_buffer = new Map<number, number>();

async function ensureRulesMap(rules?: Rule[]) {
  if (rulesMap && !rules) return;

  const currentRules = rules || (await storage.getRules());
  rulesMap = new Map();
  for (const rule of currentRules) {
    rulesMap.set(generateRuleId(rule.source), rule);
  }
}

// Initialize on load
chrome.runtime.onInstalled.addListener(async () => {
  await updateDynamicRules();
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: FLUSH_INTERVAL_MIN });
});

chrome.runtime.onStartup.addListener(async () => {
  await updateDynamicRules();
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: FLUSH_INTERVAL_MIN });

  // Crash Recovery: Check for unsynced stats
  const unsynced = await storage.getUnsyncedDeltas();
  if (unsynced.size > 0) {
      console.log('Restoring unsynced stats from previous session', unsynced);
      for (const [id, count] of unsynced) {
          temp_buffer.set(id, (temp_buffer.get(id) || 0) + count);
      }
  }
});

// Alarm Listener: Flush Buffer
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === ALARM_NAME) {
        if (temp_buffer.size > 0) {
            console.debug('Flushing stats buffer to sync...', temp_buffer);
            try {
                // "Critical: Perform a safe transaction... Only clear temp_buffer if... successful"
                await storage.syncStats(temp_buffer);

                // Success: Clear buffer and local backup
                temp_buffer.clear();
                await storage.saveUnsyncedDeltas(temp_buffer); // Clears local storage too
            } catch (e) {
                console.error('Failed to flush stats to sync:', e);
                // Buffer remains for next attempt
            }
        }
    }
});

// Listen for redirect messages / detections
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // 1. Detect Redirect (Early) - for Badge & Count
  if (changeInfo.url && changeInfo.url.includes('url_redirector=')) {
    const url = new URL(changeInfo.url);
    const source = url.searchParams.get('url_redirector');

    if (source) {
      await ensureRulesMap();
      const ids = source.split(',').map((s) => parseInt(s, 10));

      for (const id of ids) {
        if (isNaN(id)) continue;

        const rule = rulesMap?.get(id);
        if (rule) {
          if (rule.target === ':shuffle:') {
            console.debug('Shuffle rule hit, re-rolling target...');
            updateDynamicRules().catch((e: unknown) =>
              console.error('Failed to update shuffle rule:', e),
            );
          }

          // --- BUFFERED SYNC LOGIC START ---

          // 1. Increment temp_buffer (Memory)
          const currentBuffer = temp_buffer.get(rule.id) || 0;
          temp_buffer.set(rule.id, currentBuffer + 1);

          // 2. Update Local Storage Immediately (for Snappy UI + Crash Recovery)
          // incrementCount updates the rule's total in local storage
          const countMessage = getRandomMessage(rule.count + 1); // Note: rule.count might be slightly stale if temp_buffer matches
          // We pass 1 as increment. The UI will see the local update.
          await storage.incrementCount(rule.id, 1, countMessage);

          // Update local cache to reflect the new count immediately
          rule.count = (rule.count || 0) + 1;

          // 3. Persist Buffer (Crash Recovery)
          // We save the specific delta so we know what hasn't been synced
          await storage.saveUnsyncedDeltas(temp_buffer);

          // --- BUFFERED SYNC LOGIC END ---

          showBadge(rule.count);
          break;
        }
      }
    }
  }

  // 2. Detect Failed Cleanup (Late)
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('url_redirector=')) {
    const url = new URL(tab.url);
    url.searchParams.delete('url_redirector');
    chrome.tabs.update(tabId, { url: url.toString() });
  }
});

// Listen for messages from popup or options page
chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type === 'RULES_UPDATED') {
    console.debug('Rules updated, re-evaluating DNR rules...');
    const rules = await storage.getRules();
    await updateDynamicRules(rules);
    // Note: We do NOT call scanAndRedirect here to avoid double-counting.
    // The storage.onChanged event (triggered by saveRules) will handle scanning/redirecting.
  }
});

// Listen for rule changes
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'sync' && changes.rules) {
    const newRules = (changes.rules.newValue || []) as Rule[];
    const oldRules = (changes.rules.oldValue || []) as Rule[];

    await ensureRulesMap(newRules);

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
  const tabs = await chrome.tabs.query({});
  const redirects = findMatchingTabs(tabs, activeRules);
  const ruleUpdates = new Map<number, number>();

  for (const redirect of redirects) {
    chrome.tabs.update(redirect.tabId, { url: redirect.targetUrl });
    const currentCount = ruleUpdates.get(redirect.ruleId) || 0;
    ruleUpdates.set(redirect.ruleId, currentCount + 1);
  }

  for (const [ruleId, incrementBy] of ruleUpdates.entries()) {
    // Buffer Logic for Batch Redirection

    // 1. Update Memory Buffer
    const currentBuffer = temp_buffer.get(ruleId) || 0;
    temp_buffer.set(ruleId, currentBuffer + incrementBy);

    // 2. Update Local
    const rules = await storage.getRules();
    const rule = rules.find((r) => r.id === ruleId);
    if (rule) {
        const message = getRandomMessage((rule.count || 0) + incrementBy);
        await storage.incrementCount(ruleId, incrementBy, message);
        showBadge((rule.count || 0) + incrementBy);
    }

    // 3. Persist Buffer
    await storage.saveUnsyncedDeltas(temp_buffer);
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
