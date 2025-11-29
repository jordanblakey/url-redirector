import { Rule, StorageResult } from './types';

const getStorage = (): Promise<chrome.storage.StorageArea> => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(null, () => {
      if (chrome.runtime.lastError) {
        resolve(chrome.storage.local);
      } else {
        resolve(chrome.storage.sync);
      }
    });
  });
};

export const storage = {
  getRules: async (): Promise<Rule[]> => {
    const storageArea = await getStorage();
    return new Promise((resolve) => {
      storageArea.get(['rules'], (result: StorageResult) => {
        resolve(result.rules || []);
      });
    });
  },

  saveRules: async (rules: Rule[]): Promise<void> => {
    const storageArea = await getStorage();
    return new Promise((resolve) => {
      storageArea.set({ rules }, () => {
        resolve();
      });
    });
  },

  addRule: async (rule: Rule): Promise<void> => {
    const rules = await storage.getRules();
    if (rules.some((r) => r.source === rule.source)) {
      throw new Error('Duplicate source');
    }
    rules.push(rule);
    await storage.saveRules(rules);
  },

  updateRule: async (updatedRule: Rule): Promise<void> => {
    const rules = await storage.getRules();
    const index = rules.findIndex((r) => r.id === updatedRule.id);
    if (index !== -1) {
      rules[index] = updatedRule;
      await storage.saveRules(rules);
    }
  },

  deleteRule: async (id: number): Promise<Rule[]> => {
    const rules = await storage.getRules();
    const newRules = rules.filter((r) => r.id !== id);
    await storage.saveRules(newRules);
    return newRules;
  },

  incrementCount: async (id: number, incrementBy: number = 1, message?: string): Promise<void> => {
    const rules = await storage.getRules();
    const rule = rules.find((r) => r.id === id);
    if (rule) {
      rule.count = (rule.count || 0) + incrementBy;
      if (message) {
        rule.lastCountMessage = message;
      }
      await storage.saveRules(rules);
    }
  },
};
