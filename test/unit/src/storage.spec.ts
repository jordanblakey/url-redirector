import { test, expect, describe, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { storage } from '../../../src/storage';
import { Rule } from '../../../src/types';

describe('Storage', () => {
  let mockSync: Record<string, any> = {};
  let mockLocal: Record<string, any> = {};

  beforeAll(() => {
    // Mock global chrome object
    global.chrome = {
      runtime: {
        lastError: null,
      },
      storage: {
        sync: {
          get: vi.fn((keys: string[] | null, callback: (result: any) => void) => {
            if (keys === null) {
              callback(JSON.parse(JSON.stringify(mockSync)));
              return;
            }
            const result: any = {};
            keys.forEach((key) => {
              if (mockSync[key] !== undefined) {
                  result[key] = JSON.parse(JSON.stringify(mockSync[key]));
              }
            });
            callback(result);
          }),
          set: vi.fn((items: any, callback: () => void) => {
            Object.assign(mockSync, JSON.parse(JSON.stringify(items)));
            callback();
          }),
        },
        local: {
          get: vi.fn((keys: string[], callback: (result: any) => void) => {
            const result: any = {};
            keys.forEach((key) => {
               if (mockLocal[key] !== undefined) {
                   result[key] = JSON.parse(JSON.stringify(mockLocal[key]));
               }
            });
            callback(result);
          }),
          set: vi.fn((items: any, callback: () => void) => {
            Object.assign(mockLocal, JSON.parse(JSON.stringify(items)));
            callback();
          }),
        },
      },
    } as any;
  });

  beforeEach(() => {
    mockSync = {};
    mockLocal = {};
  });

  test('getRules should return empty array if no rules exist', async () => {
    const rules = await storage.getRules();
    expect(rules).toEqual([]);
  });

  test('saveRules should save rules to sync', async () => {
    const rules: Rule[] = [{ id: 1, source: 'a', target: 'b', active: true, count: 0 }];
    await storage.saveRules(rules);
    expect(mockSync.rules).toEqual(rules);
    // It should also back up to local
    expect(mockLocal.rules).toEqual(rules);
  });

  test('addRule should add a new rule to sync', async () => {
    const rule: Rule = { id: 1, source: 'a', target: 'b', active: true, count: 0 };
    await storage.addRule(rule);
    const rules = await storage.getRules();
    expect(rules).toHaveLength(1);
    expect(rules[0]).toEqual(rule);
    expect(mockSync.rules).toHaveLength(1);
  });

  test('incrementCount should update count in LOCAL only', async () => {
    const rule: Rule = { id: 1, source: 'a', target: 'b', active: true, count: 10 };
    // Setup initial state: Sync has the rule
    await storage.saveRules([rule]);

    // Clear local to ensure saveRules didn't just put it there (though it does)
    // But incrementCount logic reads from Local (or Sync if Local empty) then writes to Local.
    // For this test, we want to prove it DRIFTS from sync.
    // So let's verify baseline:
    expect(mockSync.rules[0].count).toBe(10);
    expect(mockLocal.rules[0].count).toBe(10);

    await storage.incrementCount(1, 1);

    // Check Local: should be 11
    expect(mockLocal.rules[0].count).toBe(11);

    // Check Sync: should still be 10
    expect(mockSync.rules[0].count).toBe(10);
  });

  test('getRules should merge local counts into sync rules', async () => {
    const rule: Rule = { id: 1, source: 'a', target: 'b', active: true, count: 10 };
    mockSync.rules = [rule];
    // Simulate a local update
    mockLocal.rules = [{ ...rule, count: 15 }];

    const rules = await storage.getRules();
    expect(rules[0].count).toBe(15);
  });

  test('syncStats should update sync storage with deltas', async () => {
    const rule: Rule = { id: 1, source: 'a', target: 'b', active: true, count: 10 };
    mockSync.rules = [rule];

    const deltas = new Map<number, number>();
    deltas.set(1, 5); // Add 5

    await storage.syncStats(deltas);

    expect(mockSync.rules[0].count).toBe(15);
  });

  test('should save and retrieve unsynced deltas correctly', async () => {
    const deltas = new Map<number, number>();
    deltas.set(1, 5);
    deltas.set(2, 10);

    await storage.saveUnsyncedDeltas(deltas);
    const retrieved = await storage.getUnsyncedDeltas();

    expect(retrieved).toEqual(deltas);
    expect(retrieved.get(1)).toBe(5);
    expect(retrieved.get(2)).toBe(10);
  });
});
