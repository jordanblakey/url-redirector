import { Rule, StorageResult } from './types';

// This promise queue is a lightweight mechanism to prevent race conditions.
// The chrome.storage API is asynchronous but not atomic. A classic "read-modify-write"
// operation on the same key, if executed concurrently, can cause updates to be lost.
// By chaining promises, we ensure that each `incrementCount` operation completes
// fully before the next one begins.
let updateQueue = Promise.resolve();

export const storage = {
    getRules: (): Promise<Rule[]> => {
        return new Promise((resolve) => {
            chrome.storage.local.get(['rules'], (result: StorageResult) => {
                resolve(result.rules || []);
            });
        });
    },

    saveRules: (rules: Rule[]): Promise<void> => {
        return new Promise((resolve) => {
            chrome.storage.local.set({ rules }, () => {
                resolve();
            });
        });
    },

    addRule: async (rule: Rule): Promise<void> => {
        const rules = await storage.getRules();
        if (rules.some(r => r.source === rule.source)) {
            throw new Error('Duplicate source');
        }
        rules.push(rule);
        await storage.saveRules(rules);
    },

    updateRule: async (updatedRule: Rule): Promise<void> => {
        const rules = await storage.getRules();
        const index = rules.findIndex(r => r.id === updatedRule.id);
        if (index !== -1) {
            rules[index] = updatedRule;
            await storage.saveRules(rules);
        }
    },

    deleteRule: async (id: number): Promise<Rule[]> => {
        const rules = await storage.getRules();
        const newRules = rules.filter(r => r.id !== id);
        await storage.saveRules(newRules);
        return newRules;
    },

    incrementCount: (id: number, incrementBy: number = 1, message?: string): Promise<void> => {
        // The `work` function encapsulates the non-atomic read-modify-write operation.
        const work = () => {
            return new Promise<void>((resolve) => {
                chrome.storage.local.get(['rules'], (result: StorageResult) => {
                    const rules = result.rules || [];
                    const rule = rules.find(r => r.id === id);
                    if (rule) {
                        rule.count = (rule.count || 0) + incrementBy;
                        if (message) {
                            rule.lastCountMessage = message;
                        }
                        chrome.storage.local.set({ rules }, () => {
                            resolve();
                        });
                    } else {
                        resolve();
                    }
                });
            });
        };

        // We chain the next `work` unit onto the existing queue.
        // This ensures that even if `incrementCount` is called multiple times
        // in quick succession, each `work` unit will wait for the previous one
        // to finish before starting.
        const newQueue = updateQueue.then(work);
        updateQueue = newQueue;
        return newQueue;
    }
};
