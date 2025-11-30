import { Rule, CompressedStorageResult, StorageResult } from './types.js';
import { detectLoop } from './utils.js';
import { compressRules, decompressRules } from './storage-format.js';

const CHUNK_SIZE = 8000; // Chrome's QUOTA_BYTES_PER_ITEM is 8192

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
      // Check for both old and new storage formats
      storageArea.get(null, (result: CompressedStorageResult & StorageResult) => {
        if (result.rules_chunk_count) {
          // New chunked format
          const chunkKeys = Array.from({ length: result.rules_chunk_count }, (_, i) => `rules_${i}`);
          storageArea.get(chunkKeys, (chunks) => {
            const jsonString = chunkKeys.map((key) => chunks[key]).join('');
            const compressedRules = JSON.parse(jsonString);
            resolve(decompressRules(compressedRules));
          });
        } else if (result.rules) {
          // Old format - migrate to new format
          const rules = result.rules || [];
          storage.saveRules(rules).then(() => {
            resolve(rules);
          });
        } else {
          resolve([]);
        }
      });
    });
  },

  saveRules: async (rules: Rule[]): Promise<void> => {
    const storageArea = await getStorage();
    const compressedRules = compressRules(rules);
    const jsonString = JSON.stringify(compressedRules);

    const chunks: { [key: string]: string } = {};
    const numChunks = Math.ceil(jsonString.length / CHUNK_SIZE);

    for (let i = 0; i < numChunks; i++) {
      chunks[`rules_${i}`] = jsonString.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    }

    // First, clear out all old rule data to prevent orphans
    const oldKeysToRemove = await new Promise<string[]>((resolve) => {
      storageArea.get(null, (items) => {
        resolve(Object.keys(items).filter((key) => key.startsWith('rules')));
      });
    });

    await new Promise<void>((resolve) => {
      storageArea.remove(oldKeysToRemove, () => resolve());
    });

    // Now, save the new chunks
    await new Promise<void>((resolve) => {
      storageArea.set({
        ...chunks,
        rules_chunk_count: numChunks,
      }, () => {
        resolve();
      });
    });
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

    // Filter out the rule being updated to avoid checking against its old self
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

  incrementCount: async (id: number, incrementBy: number = 1): Promise<void> => {
    const rules = await storage.getRules();
    const rule = rules.find((r) => r.id === id);
    if (rule) {
      rule.count = (rule.count || 0) + incrementBy;
      await storage.saveRules(rules);
    }
  },
};
