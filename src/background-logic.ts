import { Rule } from './types';
import { shouldRuleApply, generateRuleId, matchAndGetTarget, normalizeUrl } from './utils.js';
import { getRandomProductiveUrl } from './suggestions.js';

export function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Pure function to build DNR rules from user rules
 * No side effects, no Chrome API calls - easily testable
 */
export function buildDNRRules(rules: Rule[]): chrome.declarativeNetRequest.Rule[] {
  const dnrRules: chrome.declarativeNetRequest.Rule[] = [];

  for (const rule of rules) {
    if (!shouldRuleApply(rule)) continue;

    let target = rule.target;
    if (target === ':shuffle:') {
      target = getRandomProductiveUrl();
    }

    const id = generateRuleId(rule.source);

    // Normalize source for DNR
    const source = normalizeUrl(rule.source);
    const escapedSource = escapeRegex(source);

    let finalTarget = target;
    if (!finalTarget.startsWith('http')) {
      finalTarget = `https://${finalTarget}`;
    }

    // Determine separator for target URL
    const separator = finalTarget.includes('?') ? '&' : '?';

    // Rule 1: Preserve Chain (Priority 2)
    // Matches if url_redirector exists in the source URL
    // Appends current source to the existing chain
    const preserveRule: chrome.declarativeNetRequest.Rule = {
      id: id, // Use same ID? No, IDs must be unique.
      // We need a unique ID for the second rule.
      // Let's use id for preserve, and id + 1000000 for start?
      // Or just generate a different ID.
      // But generateRuleId is deterministic based on source.
      // We can't have two rules with same ID.
      // Let's bitwise NOT for the second ID? Or just add a large offset.
      // Max ID is not strictly limited but should be unique.
      // Let's use id * 2 for preserve, id * 2 + 1 for start?
      // But generateRuleId returns a hash.
      // Let's modify generateRuleId or just append a suffix before hashing?
      // But we can't change generateRuleId easily as it's used elsewhere.
      // Let's just use id for Start (default) and id + 1 for Preserve?
      // But collisions.
      // Let's assume the hash space is large enough.
      // Let's use `id` for Start (standard) and `id ^ 0xDEADBEEF` for Preserve?
      // Let's keep it simple: `id` for Start, `id + 1` (if we can ensure spacing)
      // Actually, `generateRuleId` returns a 32-bit integer.
      // Let's just use `generateRuleId(source + '|preserve')` for the preserve rule.
      priority: 2,
      action: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: 'redirect' as any,
        redirect: {
          regexSubstitution: `${finalTarget}${separator}url_redirector=\\3,${source}`,
        },
      },
      condition: {
        // Match: protocol (http/s) + (www.)? + source + (path)? + query param url_redirector
        // Group 1: www. (optional)
        // Group 2: path (optional)
        // Group 3: existing url_redirector value
        regexFilter: `^https?://(www\\.)?${escapedSource}(/.*)?[?&]url_redirector=([^&]+)`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resourceTypes: ['main_frame' as any],
      },
    };

    // Rule 2: Start Chain (Priority 1)
    // Matches if url_redirector does NOT exist (or just generic match with lower priority)
    // Sets url_redirector to current source
    const startRule: chrome.declarativeNetRequest.Rule = {
      id: generateRuleId(source + '|start'), // Ensure unique ID
      priority: 1,
      action: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: 'redirect' as any,
        redirect: {
          regexSubstitution: `${finalTarget}${separator}url_redirector=${source}`,
        },
      },
      condition: {
        // Match: protocol (http/s) + (www.)? + source + (path)?
        regexFilter: `^https?://(www\\.)?${escapedSource}(/.*)?$`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resourceTypes: ['main_frame' as any],
      },
    };

    dnrRules.push(preserveRule, startRule);
  }

  return dnrRules;
}

/**
 * Pure function to find rules that have become active
 * Compares old and new rule states
 */
export function findActivelyChangedRules(newRules: Rule[], oldRules: Rule[]): Rule[] {
  return newRules.filter((newRule) => {
    const oldRule = oldRules.find((r) => r.id === newRule.id);
    const isNowActive = shouldRuleApply(newRule);
    const wasActive = oldRule ? shouldRuleApply(oldRule) : false;
    return isNowActive && !wasActive;
  });
}

/**
 * Type for tab redirect information
 */
export interface TabRedirect {
  tabId: number;
  targetUrl: string;
  ruleId: number;
  ruleCount: number;
}

/**
 * Pure function to find which tabs should be redirected
 * Returns array of tab redirects to perform
 */
export function findMatchingTabs(
  tabs: Array<{ id?: number; url?: string }>,
  rules: Rule[],
): TabRedirect[] {
  const redirects: TabRedirect[] = [];

  for (const tab of tabs) {
    if (!tab.url || !tab.id) continue;

    for (const rule of rules) {
      const target = matchAndGetTarget(tab.url, rule);
      if (target) {
        redirects.push({
          tabId: tab.id,
          targetUrl: target,
          ruleId: rule.id,
          ruleCount: rule.count || 0,
        });
        break; // Only first matching rule per tab
      }
    }
  }

  return redirects;
}
