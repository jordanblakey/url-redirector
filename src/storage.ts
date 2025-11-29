import { Rule, StorageResult } from './types';
import { detectLoop } from './utils.js';

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
    // Primary Source: Sync (or fallback)
    const storageArea = await getStorage();
    const rules = await new Promise<Rule[]>((resolve) => {
      storageArea.get(['rules'], (result: StorageResult) => {
        resolve(result.rules || []);
      });
    });

    // Secondary Source: Local (for immediate UI updates/unsynced counts)
    // We assume local might have newer counts if sync hasn't happened yet.
    // If we are already using local as primary, this is redundant but harmless.
    if (storageArea === chrome.storage.sync) {
      const localRules = await new Promise<Rule[]>((resolve) => {
        chrome.storage.local.get(['rules'], (result: StorageResult) => {
          resolve(result.rules || []);
        });
      });

      // Merge local counts into sync rules
      if (localRules.length > 0) {
        for (const rule of rules) {
          const localRule = localRules.find((r) => r.id === rule.id);
          if (localRule && (localRule.count || 0) > (rule.count || 0)) {
            rule.count = localRule.count;
            if (localRule.lastCountMessage) {
              rule.lastCountMessage = localRule.lastCountMessage;
            }
          }
        }
      }
    }

    return rules;
  },

  // Save rules: Always try Sync first (prompt: "Save to chrome.storage.sync immediately")
  saveRules: async (rules: Rule[]): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ rules }, () => {
        if (chrome.runtime.lastError) {
          // Fallback to local if sync fails
          chrome.storage.local.set({ rules }, () => resolve());
        } else {
          // Also update local to keep it in sync for fallback/snappy UI
          chrome.storage.local.set({ rules }, () => resolve());
        }
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

  // Buffered Sync Strategy: Update local immediately, return, and let Background handle sync.
  incrementCount: async (id: number, incrementBy: number = 1, message?: string): Promise<void> => {
    // We update 'local' immediately for snappy UI.
    // We do NOT call saveRules() because that hits Sync.

    // Get current state from LOCAL (or sync if local is empty/first run)
    const localResult = await new Promise<StorageResult>((resolve) => {
      chrome.storage.local.get(['rules'], (r) => resolve(r as StorageResult));
    });

    let rules = localResult.rules || [];

    // If local is empty, populate from sync first to have a base
    if (rules.length === 0) {
        rules = await storage.getRules();
    }

    const rule = rules.find((r) => r.id === id);
    if (rule) {
      rule.count = (rule.count || 0) + incrementBy;
      if (message) {
        rule.lastCountMessage = message;
      }

      // Save only to LOCAL
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ rules }, () => resolve());
      });
    }
  },

  // Called by Background Alarm to flush stats
  syncStats: async (deltas: Map<number, number>): Promise<void> => {
    if (deltas.size === 0) return;

    return new Promise((resolve, reject) => {
        // 1. Fetch current Sync Rules
        chrome.storage.sync.get(['rules'], (result: StorageResult) => {
            if (chrome.runtime.lastError) {
                // If sync is down, we can't flush.
                // We leave the buffer (handled by caller) and try later.
                return reject(chrome.runtime.lastError);
            }

            const rules = result.rules || [];
            let updated = false;

            // 2. Apply Deltas
            for (const [id, delta] of deltas.entries()) {
                const rule = rules.find(r => r.id === id);
                if (rule) {
                    rule.count = (rule.count || 0) + delta;
                    updated = true;
                }
            }

            if (!updated) {
                resolve();
                return;
            }

            // 3. Save back to Sync
            chrome.storage.sync.set({ rules }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    });
  },

  // Helper for Crash Recovery
  getUnsyncedDeltas: async (): Promise<Map<number, number>> => {
      return new Promise((resolve) => {
          chrome.storage.local.get(['unsynced_deltas'], (result) => {
               const raw = result.unsynced_deltas || {};
               // Convert object back to Map (keys are strings in JSON, need Number)
               const map = new Map<number, number>();
               for(const k of Object.keys(raw)) {
                   map.set(Number(k), raw[k]);
               }
               resolve(map);
          });
      });
  },

  saveUnsyncedDeltas: async (deltas: Map<number, number>): Promise<void> => {
      const obj = Object.fromEntries(deltas);
      return new Promise((resolve) => {
          chrome.storage.local.set({ unsynced_deltas: obj }, () => resolve());
      });
  }
};
