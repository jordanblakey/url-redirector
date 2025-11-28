import { Rule } from "./types";
import { shouldRuleApply, generateRuleId, matchAndGetTarget } from "./utils.js";
import { getRandomProductiveUrl } from "./suggestions.js";

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
        let source = rule.source.toLowerCase();
        source = source.replace(/^https?:\/\//, '');
        source = source.replace(/^www\./, '');

        const dnrRule: chrome.declarativeNetRequest.Rule = {
            id: id,
            priority: 1,
            action: {
                type: 'redirect' as any,
                redirect: {
                    url: target.startsWith('http') ? target : `https://${target}`
                }
            },
            condition: {
                urlFilter: `||${source}`,
                resourceTypes: ['main_frame' as any]
            }
        };

        dnrRules.push(dnrRule);
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
    rules: Rule[]
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
