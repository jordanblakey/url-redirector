import { Rule, CompressedRule, StorageResult, CompressedStorageResult } from './types';
import { detectLoop } from './utils.js';

// Quota per item in sync storage
const SYNC_QUOTA_BYTES_PER_ITEM = 8192;
// Estimated overhead for key and JSON structure
const CHUNK_OVERHEAD = 100;
// Safe limit for chunk size
const CHUNK_SIZE_LIMIT = SYNC_QUOTA_BYTES_PER_ITEM - CHUNK_OVERHEAD;

// Compression Helpers
const compressRule = (rule: Rule): CompressedRule => {
  const compressed: CompressedRule = [
    rule.id,
    rule.source,
    rule.target,
    rule.active ? 1 : 0,
    rule.count,
  ];
  if (rule.pausedUntil !== undefined || rule.lastCountMessage !== undefined) {
    compressed.push(rule.pausedUntil ?? 0);
  }
  if (rule.lastCountMessage !== undefined) {
    compressed.push(rule.lastCountMessage);
  }
  return compressed;
};

const decompressRule = (compressed: CompressedRule): Rule => {
  const [id, source, target, active, count, pausedUntil, lastCountMessage] = compressed;
  const rule: Rule = {
    id,
    source,
    target,
    active: !!active,
    count,
  };
  if (pausedUntil && pausedUntil > 0) {
    rule.pausedUntil = pausedUntil;
  }
  if (lastCountMessage) {
    rule.lastCountMessage = lastCountMessage;
  }
  return rule;
};

// Storage Implementation
export const storage = {
  getRules: async (): Promise<Rule[]> => {
    // If forced to local storage (e.g. testing or user preference override if we ever add it)
    if (globalThis.FORCE_LOCAL_STORAGE) {
      const localData = await chrome.storage.local.get(['rules']);
      return localData.rules as Rule[] || [];
    }

    // Always try local first as it's the primary cache
    const localData = await chrome.storage.local.get(['rules']);
    if (localData.rules) {
      return localData.rules as Rule[];
    }

    // Fallback: Try to migrate from old uncompressed sync format
    const oldSyncData = await chrome.storage.sync.get(['rules']);
    if (oldSyncData.rules) {
      console.log('Migrating from old sync format...');
      await storage.saveRules(oldSyncData.rules as Rule[]);
      return oldSyncData.rules as Rule[];
    }

    // Fallback: Try to load from compressed sync format (cold start on new device)
    const syncData = await chrome.storage.sync.get(null);
    const compressedRules: CompressedRule[] = [];
    Object.keys(syncData).forEach((key) => {
      if (key.startsWith('rules_chunk_')) {
        const chunk = syncData[key] as CompressedRule[];
        compressedRules.push(...chunk);
      }
    });

    if (compressedRules.length > 0) {
      const rules = compressedRules.map(decompressRule);
      // Cache to local immediately
      await chrome.storage.local.set({ rules });
      return rules;
    }

    return [];
  },

  // Save to local immediately and schedule sync
  saveRules: async (rules: Rule[]): Promise<void> => {
    // 1. Save to local storage (fast, unlimited)
    await chrome.storage.local.set({ rules });

    // If forcing local, we stop here
    if (globalThis.FORCE_LOCAL_STORAGE) return;

    // 2. Notify background to schedule a sync
    try {
      chrome.runtime.sendMessage({ type: 'SCHEDULE_SYNC' });
      chrome.runtime.sendMessage({ type: 'RULES_UPDATED' });
    } catch (e) {
      // Ignore errors if context invalid
    }
  },

  // Internal: Called by background script to actually write to sync storage
  syncToCloud: async (): Promise<void> => {
    const localData = await chrome.storage.local.get(['rules']);
    const rules = localData.rules as Rule[];
    if (!rules) return;

    const compressed = rules.map(compressRule);

    // Chunking Logic
    const chunks: { [key: string]: CompressedRule[] } = {};
    let currentChunkIndex = 0;
    let currentChunkSize = 0;
    let currentChunk: CompressedRule[] = [];

    for (const rule of compressed) {
      // Approximate size of the rule in JSON
      const ruleSize = JSON.stringify(rule).length + 2; // +2 for comma/brackets approximation

      if (currentChunkSize + ruleSize > CHUNK_SIZE_LIMIT) {
        chunks[`rules_chunk_${currentChunkIndex}`] = currentChunk;
        currentChunkIndex++;
        currentChunk = [];
        currentChunkSize = 0;
      }

      currentChunk.push(rule);
      currentChunkSize += ruleSize;
    }
    // Push last chunk
    if (currentChunk.length > 0) {
      chunks[`rules_chunk_${currentChunkIndex}`] = currentChunk;
    }

    // Get existing chunks to clear stale ones
    const existing = await chrome.storage.sync.get(null);
    const keysToRemove: string[] = [];
    Object.keys(existing).forEach((key) => {
      if (key.startsWith('rules_chunk_') && !chunks[key]) {
        keysToRemove.push(key);
      }
      // Also remove old 'rules' key if it exists
      if (key === 'rules') {
        keysToRemove.push(key);
      }
    });

    if (keysToRemove.length > 0) {
      await chrome.storage.sync.remove(keysToRemove);
    }
    await chrome.storage.sync.set(chunks);
    console.log(`Synced ${rules.length} rules to cloud in ${Object.keys(chunks).length} chunks.`);
  },

  // Internal: Called by background script when sync storage changes
  syncFromCloud: async (changes: { [key: string]: chrome.storage.StorageChange }): Promise<void> => {
    const hasRuleChanges = Object.keys(changes).some(
      (key) => key.startsWith('rules_chunk_') || key === 'rules'
    );

    if (!hasRuleChanges) return;

    const syncData = await chrome.storage.sync.get(null);
    const compressedRules: CompressedRule[] = [];

    const keys = Object.keys(syncData).filter(k => k.startsWith('rules_chunk_'));
    keys.sort((a, b) => {
      const idxA = parseInt(a.replace('rules_chunk_', ''), 10);
      const idxB = parseInt(b.replace('rules_chunk_', ''), 10);
      return idxA - idxB;
    });

    keys.forEach((key) => {
      const chunk = syncData[key] as CompressedRule[];
      compressedRules.push(...chunk);
    });

    // Also handle legacy 'rules' key if it appeared
    if (syncData.rules) {
       if (compressedRules.length === 0) {
         const legacyRules = syncData.rules as Rule[];
         await chrome.storage.local.set({ rules: legacyRules });
         return;
       }
    }

    if (compressedRules.length > 0) {
      const rules = compressedRules.map(decompressRule);
      await chrome.storage.local.set({ rules });
      try {
          chrome.runtime.sendMessage({ type: 'RULES_UPDATED' });
      } catch (e) {
          // Ignore
      }
    }
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
