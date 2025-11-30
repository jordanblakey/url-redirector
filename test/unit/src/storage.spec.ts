import { test, expect, describe, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { storage } from '../../../src/storage';
import { Rule, CompressedRule } from '../../../src/types';

// Mock chrome.storage.local/sync
let mockLocal: Record<string, any> = {};
let mockSync: Record<string, any> = {};

// Mock chrome.runtime
const mockRuntime = {
  lastError: null,
  sendMessage: vi.fn(),
};

describe('Storage', () => {

  beforeAll(() => {
    // Mock global chrome object
    global.chrome = {
      runtime: mockRuntime,
      storage: {
        sync: {
          get: vi.fn((keys: string[] | null | object, callback: (result: any) => void) => {
            // Vitest mock implementation for get
            // If callback is not provided (which is how we use it with await/Promise), we need to handle that?
            // Wait, in src/storage.ts we use await chrome.storage.sync.get() which returns a Promise if callback is missing.
            // But here we are mocking the method. We need to check if the caller expects a promise.
            // In a real environment, it returns a Promise if no callback.
            // Our mock should probably return a Promise.
            return new Promise((resolve) => {
               let result: any = {};
               if (keys === null) {
                 result = {...mockSync};
               } else if (Array.isArray(keys)) {
                 keys.forEach((key) => {
                   if (mockSync[key] !== undefined) result[key] = mockSync[key];
                 });
               } else if (typeof keys === 'string') { // Deprecated but possible
                   if (mockSync[keys] !== undefined) result[keys] = mockSync[keys];
               } else if (typeof keys === 'object') {
                   // Defaults
               }

               if (callback) callback(result);
               resolve(result);
            });
          }),
          set: vi.fn((items: any, callback: () => void) => {
            return new Promise<void>((resolve) => {
                Object.assign(mockSync, items);
                if (callback) callback();
                resolve();
            });
          }),
          remove: vi.fn((keys: string | string[], callback: () => void) => {
            return new Promise<void>((resolve) => {
                const keyList = Array.isArray(keys) ? keys : [keys];
                keyList.forEach(k => delete mockSync[k]);
                if (callback) callback();
                resolve();
            });
          }),
        },
        local: {
          get: vi.fn((keys: string[] | null | object, callback: (result: any) => void) => {
             return new Promise((resolve) => {
                let result: any = {};
                if (keys === null) {
                    result = {...mockLocal};
                } else if (Array.isArray(keys)) {
                  keys.forEach((key) => {
                    if (mockLocal[key] !== undefined) result[key] = mockLocal[key];
                  });
                }
                if (callback) callback(result);
                resolve(result);
             });
          }),
          set: vi.fn((items: any, callback: () => void) => {
            return new Promise<void>((resolve) => {
                Object.assign(mockLocal, items);
                if (callback) callback();
                resolve();
            });
          }),
        },
      },
    } as any;
  });

  beforeEach(() => {
    mockLocal = {};
    mockSync = {};
    mockRuntime.sendMessage.mockClear();
    vi.clearAllMocks();
  });

  test('getRules should return empty array if no rules exist', async () => {
    const rules = await storage.getRules();
    expect(rules).toEqual([]);
  });

  test('saveRules should save to local and schedule sync', async () => {
    const rules: Rule[] = [{ id: 1, source: 'a', target: 'b', active: true, count: 0 }];
    await storage.saveRules(rules);

    // Check local storage
    expect(mockLocal.rules).toEqual(rules);

    // Check sync NOT updated yet
    expect(mockSync.rules).toBeUndefined();
    expect(mockSync.rules_chunk_0).toBeUndefined();

    // Check message sent
    expect(mockRuntime.sendMessage).toHaveBeenCalledWith({ type: 'SCHEDULE_SYNC' });
  });

  test('syncToCloud should compress and chunk rules', async () => {
    const rules: Rule[] = [
      { id: 1, source: 'src1', target: 'tgt1', active: true, count: 10, pausedUntil: 100 },
      { id: 2, source: 'src2', target: 'tgt2', active: false, count: 0 }
    ];
    mockLocal.rules = rules;

    await storage.syncToCloud();

    // Verify sync storage content
    expect(mockSync.rules).toBeUndefined(); // Should not use legacy key
    expect(mockSync.rules_chunk_0).toBeDefined();

    const chunk = mockSync.rules_chunk_0 as CompressedRule[];
    expect(chunk).toHaveLength(2);

    // Verify compression
    // Rule 1: [1, 'src1', 'tgt1', 1, 10, 100]
    expect(chunk[0]).toEqual([1, 'src1', 'tgt1', 1, 10, 100]);
    // Rule 2: [2, 'src2', 'tgt2', 0, 0]
    expect(chunk[1]).toEqual([2, 'src2', 'tgt2', 0, 0]);
  });

  test('syncFromCloud should decompress and update local', async () => {
    // Setup sync storage with compressed data
    const compressedRules: CompressedRule[] = [
       [1, 'src1', 'tgt1', 1, 10, 100]
    ];
    mockSync.rules_chunk_0 = compressedRules;

    // Simulate change event
    const changes = {
        rules_chunk_0: {
            newValue: compressedRules,
            oldValue: undefined
        }
    };

    await storage.syncFromCloud(changes as any);

    // Check local storage
    const rules = mockLocal.rules as Rule[];
    expect(rules).toHaveLength(1);
    expect(rules[0]).toEqual({
        id: 1,
        source: 'src1',
        target: 'tgt1',
        active: true,
        count: 10,
        pausedUntil: 100
    });
  });

  test('chunking works for large datasets', async () => {
    // Create enough rules to exceed one chunk (8KB)
    // 1000 rules, each ~50 bytes compressed
    const rules: Rule[] = [];
    for (let i = 0; i < 200; i++) {
        rules.push({
            id: i,
            source: `https://example.com/very/long/url/path/${i}`,
            target: `https://redirect.to/somewhere/else/${i}`,
            active: true,
            count: i
        });
    }
    mockLocal.rules = rules;

    await storage.syncToCloud();

    const keys = Object.keys(mockSync).filter(k => k.startsWith('rules_chunk_'));
    expect(keys.length).toBeGreaterThan(1);

    // Verify we can read it back
    // Simulate reading chunks manually as getRules uses sync if local is empty
    mockLocal = {};
    const loadedRules = await storage.getRules();
    expect(loadedRules).toHaveLength(200);
    expect(loadedRules[199].id).toBe(199);
  });

  test('migration from legacy sync format', async () => {
      const legacyRules: Rule[] = [{ id: 99, source: 'old', target: 'new', active: true, count: 5 }];
      mockSync.rules = legacyRules;
      mockLocal = {}; // Ensure local is empty to trigger fallback

      const loadedRules = await storage.getRules();

      expect(loadedRules).toHaveLength(1);
      expect(loadedRules[0].source).toBe('old');

      // Should have saved to local
      expect(mockLocal.rules).toHaveLength(1);
  });

  test('addRule saves to local and schedules sync', async () => {
      const rule: Rule = { id: 1, source: 'a', target: 'b', active: true, count: 0 };
      await storage.addRule(rule);

      expect(mockLocal.rules).toHaveLength(1);
      expect(mockRuntime.sendMessage).toHaveBeenCalledWith({ type: 'SCHEDULE_SYNC' });
  });

});
