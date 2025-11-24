import { Rule, StorageResult } from './types';
import { getRandomMessage } from './messages.js';
import { toggleRuleState } from './rules.js';

export async function getRules(): Promise<Rule[]> {
    return new Promise((resolve) => {
        chrome.storage.local.get(['rules'], (result: StorageResult) => {
            resolve(result.rules || []);
        });
    });
}

export async function saveRules(rules: Rule[]): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.local.set({ rules }, () => {
            resolve();
        });
    });
}

export async function addRule(source: string, target: string): Promise<void> {
    const rules = await getRules();

    // Check for duplicate source
    if (rules.some(rule => rule.source === source)) {
        throw new Error('Duplicate source');
    }

    const newRule: Rule = {
        source,
        target,
        id: Date.now(),
        count: 0,
        active: true
    };
    rules.push(newRule);

    await saveRules(rules);
}

export async function deleteRule(id: number): Promise<void> {
    const rules = await getRules();
    const newRules = rules.filter((rule) => rule.id !== id);
    await saveRules(newRules);
}

export async function toggleRule(id: number): Promise<Rule | undefined> {
    const rules = await getRules();
    const rule = rules.find((r) => r.id === id);
    if (rule) {
        toggleRuleState(rule);
        await saveRules(rules);
        return rule;
    }
    return undefined;
}

export async function incrementRuleCount(id: number, amount: number = 1): Promise<void> {
    const rules = await getRules();
    const rule = rules.find((r) => r.id === id);
    if (rule) {
        rule.count = (rule.count || 0) + amount;
        rule.lastCountMessage = getRandomMessage(rule.count);
        await saveRules(rules);
    }
}
