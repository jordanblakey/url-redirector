import { Rule, StorageResult, CompressedRule, CompressedStorageResult } from './types.js';
import { detectLoop } from './utils.js';

const CHUNK_SIZE = 8000; // 8KB, leaving some buffer for keys

const compressRules = (rules: Rule[]): CompressedRule[] => {
  return rules.map(rule => [
    rule.id,
    rule.source,
    rule.target,
    rule.count,
    rule.active,
    rule.pausedUntil,
    rule.lastCountMessage,
  ]);
};

export const decompressRules = (compressedRules: CompressedRule[]): Rule[] => {
  return compressedRules.map(rule => ({
    id: rule[0],
    source: rule[1],
    target: rule[2],
    count: rule[3],
    active: rule[4],
    pausedUntil: rule[5],
    lastCountMessage: rule[6],
  }));
};


export const syncToCloud = async (rules: Rule[]): Promise<void> => {
  const compressedRules = compressRules(rules);
  const jsonStr = JSON.stringify(compressedRules);
  const chunks: { [key: string]: string } = {};
  for (let i = 0; i * CHUNK_SIZE < jsonStr.length; i++) {
    chunks[`rules_chunk_${i}`] = jsonStr.substr(i * CHUNK_SIZE, CHUNK_SIZE);
  }

  // Clear old chunks before setting new ones
  const oldKeys = Object.keys(await chrome.storage.sync.get());
  const oldChunkKeys = oldKeys.filter(key => key.startsWith('rules_chunk_'));
  if (oldChunkKeys.length > 0) {
    await chrome.storage.sync.remove(oldChunkKeys);
  }

  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(chunks, () => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve();
    });
  });
};

export const syncFromCloud = (): Promise<Rule[]> => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(null, (items: CompressedStorageResult) => {
      const chunks = Object.keys(items)
        .filter(key => key.startsWith('rules_chunk_'))
        .sort()
        .map(key => items[key]);

      if (chunks.length === 0) {
        return resolve([]);
      }

      const jsonStr = chunks.join('');
      const compressedRules: CompressedRule[] = JSON.parse(jsonStr);
      const rules = decompressRules(compressedRules);
      saveToLocal(rules).then(() => resolve(rules));
    });
  });
};

export const saveToLocal = (rules: Rule[]): Promise<void> => {
  return new Promise((resolve) => {
    chrome.storage.local.set({ rules }, () => {
      resolve();
    });
  });
};

export const storage = {
  getRules: (): Promise<Rule[]> => {
    return new Promise((resolve) => {
      chrome.storage.local.get(['rules'], (result: StorageResult) => {
        resolve(result.rules || []);
      });
    });
  },

  saveRules: async (rules: Rule[]): Promise<void> => {
    await saveToLocal(rules);
    chrome.runtime.sendMessage({ type: 'RULES_UPDATED' });
  },

  addRule: async (rule: Rule): Promise<void> => {
    const rules = await storage.getRules();
    if (rules.some((r) => r.source === rule.source)) {
      throw new Error('Duplicate source');
    }
    if (detectLoop(rule.source, rule.target, rules)) {
      throw new Error('Redirect loop detected');
    }
    rules.push(rule);
    await storage.saveRules(rules);
  },

  updateRule: async (updatedRule: Rule): Promise<void> => {
    const rules = await storage.getRules();
    const index = rules.findIndex((r) => r.id === updatedRule.id);

    const otherRules = rules.filter((r) => r.id !== updatedRule.id);

    if (detectLoop(updatedRule.source, updatedRule.target, otherRules)) {
      throw new Error('Redirect loop detected');
    }

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
