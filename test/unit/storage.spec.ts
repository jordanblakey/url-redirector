
import { test, expect } from '../fixtures';
import { storage } from '../../src/storage';
import { Rule } from '../../src/types';

test.describe('Storage', () => {
    let mockStorage: Record<string, any> = {};

    test.beforeAll(() => {
        // Mock global chrome object
        global.chrome = {
            storage: {
                local: {
                    get: (keys: string[], callback: (result: any) => void) => {
                        const result: any = {};
                        keys.forEach(key => {
                            result[key] = mockStorage[key];
                        });
                        callback(result);
                    },
                    set: (items: any, callback: () => void) => {
                        Object.assign(mockStorage, items);
                        callback();
                    }
                }
            }
        } as any;
    });

    test.beforeEach(() => {
        mockStorage = {};
    });

    test('getRules should return empty array if no rules exist', async () => {
        const rules = await storage.getRules();
        expect(rules).toEqual([]);
    });

    test('saveRules should save rules to storage', async () => {
        const rules: Rule[] = [{ id: 1, source: 'a', target: 'b', active: true, count: 0 }];
        await storage.saveRules(rules);
        expect(mockStorage.rules).toEqual(rules);
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

    test('incrementCount should update message if provided', async () => {
        const rule: Rule = { id: 1, source: 'a', target: 'b', active: true, count: 0 };
        await storage.addRule(rule);

        await storage.incrementCount(1, 1, 'Redirected!');
        const rules = await storage.getRules();
        expect(rules[0].lastCountMessage).toBe('Redirected!');
    });

    test('incrementCount should do nothing if rule not found', async () => {
        await storage.incrementCount(999);
        const rules = await storage.getRules();
        expect(rules).toHaveLength(0);
    });
});
