import { test, expect, describe, beforeEach, vi } from 'vitest';
import { storage } from '../../../src/storage';
import { Rule } from '../../../src/types';
import { compressRules } from '../../../src/storage-format';

// In-memory mock of chrome.storage
const createStorageMock = () => {
  let a: { [key: string]: any } = {};
  return {
    get: vi.fn((keys, callback) => {
      // If keys is null, return all items.
      if (keys === null) {
        // Deep copy to prevent tests from modifying the mock's internal state.
        callback(JSON.parse(JSON.stringify(a)));
        return;
      }
      // If keys is an array, return the corresponding items.
      const result: { [key: string]: any } = {};
      for (const key of keys) {
        if (a[key] !== undefined) {
          // Deep copy for safety.
          result[key] = JSON.parse(JSON.stringify(a[key]));
        }
      }
      callback(result);
    }),
    set: vi.fn((items, callback) => {
      // Deep copy to prevent shared references.
      a = { ...a, ...JSON.parse(JSON.stringify(items)) };
      if (callback) {
        callback();
      }
    }),
    remove: vi.fn((keys, callback) => {
      for (const key of keys) {
        delete a[key];
      }
      if (callback) {
        callback();
      }
    }),
    clear: vi.fn(() => {
      a = {};
    }),
  };
};

describe('Storage', () => {
  beforeEach(() => {
    const mockStorage = createStorageMock();
    global.chrome = {
      runtime: {
        lastError: null,
      },
      storage: {
        sync: mockStorage,
        local: mockStorage,
      },
    } as any;
  });

  test('getRules should return empty array if no rules exist', async () => {
    const rules = await storage.getRules();
    expect(rules).toEqual([]);
  });

  test('saveRules should save rules to storage', async () => {
    const rules: Rule[] = [{ id: 1, source: 'a', target: 'b', active: true, count: 0 }];
    await storage.saveRules(rules);
    const savedRules = await storage.getRules();
    expect(savedRules).toEqual(rules);
  });

  test('addRule should add a new rule', async () => {
    const rule: Rule = { id: 1, source: 'a', target: 'b', active: true, count: 0 };
    await storage.addRule(rule);
    const rules = await storage.getRules();
    expect(rules).toHaveLength(1);
    expect(rules[0]).toEqual(rule);
  });

  test('addRule should throw error for duplicate source', async () => {
    const rule: Rule = { id: 1, source: 'a', target: 'b', active: true, count: 0 };
    await storage.addRule(rule);
    await expect(storage.addRule(rule)).rejects.toThrow('Duplicate source');
  });

  test('updateRule should update an existing rule', async () => {
    const rule: Rule = { id: 1, source: 'a', target: 'b', active: true, count: 0 };
    await storage.addRule(rule);

    const updatedRule = { ...rule, target: 'c' };
    await storage.updateRule(updatedRule);

    const rules = await storage.getRules();
    expect(rules[0].target).toBe('c');
  });

  test('updateRule should do nothing if rule does not exist', async () => {
    const rule: Rule = { id: 1, source: 'a', target: 'b', active: true, count: 0 };
    await storage.updateRule(rule);
    const rules = await storage.getRules();
    expect(rules).toHaveLength(0);
  });

  test('deleteRule should remove a rule by ID', async () => {
    const rule1: Rule = { id: 1, source: 'a', target: 'b', active: true, count: 0 };
    const rule2: Rule = { id: 2, source: 'c', target: 'd', active: true, count: 0 };
    await storage.addRule(rule1);
    await storage.addRule(rule2);

    await storage.deleteRule(1);
    const rules = await storage.getRules();
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe(2);
  });

  test('incrementCount should increase count', async () => {
    const rule: Rule = { id: 1, source: 'a', target: 'b', active: true, count: 0 };
    await storage.addRule(rule);

    await storage.incrementCount(1);
    const rules = await storage.getRules();
    expect(rules[0].count).toBe(1);
  });

  test('incrementCount should do nothing if rule not found', async () => {
    await storage.incrementCount(999);
    const rules = await storage.getRules();
    expect(rules).toHaveLength(0);
  });

  test('getRules should handle legacy rule format', async () => {
    const legacyRules = [
      { id: 1, source: 'a', target: 'b', active: true, count: 0, lastCountMessage: 'hi' },
    ];
    // @ts-expect-error - Intentionally setting legacy format
    global.chrome.storage.sync.set({ rules: legacyRules });

    const rules = await storage.getRules();
    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe('a');

    // After migration, the new format should be in place
    const compressedRules = compressRules(legacyRules);
    const jsonString = JSON.stringify(compressedRules);

    const chunkResult: { [key: string]: any } = {};
    chunkResult['rules_0'] = jsonString.slice(0, 8000);
    chunkResult.rules_chunk_count = 1;

    // Check that storage.set was called with the new chunked format
    expect(global.chrome.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining(chunkResult),
      expect.any(Function)
    );
  });
});
