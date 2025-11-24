
import { test, expect } from '@playwright/test';
import { Rule } from '../../src/types';
import { shouldRuleApply } from '../../src/utils';

test.describe('Snooze Functionality', () => {
    test('should apply rule if not paused and active', () => {
        const rule: Rule = {
            id: 1,
            source: 'example.com',
            target: 'google.com',
            count: 0,
            active: true
        };
        expect(shouldRuleApply(rule)).toBe(true);
    });

    test('should not apply rule if inactive', () => {
        const rule: Rule = {
            id: 1,
            source: 'example.com',
            target: 'google.com',
            count: 0,
            active: false
        };
        expect(shouldRuleApply(rule)).toBe(false);
    });

    test('should not apply rule if paused', () => {
        const rule: Rule = {
            id: 1,
            source: 'example.com',
            target: 'google.com',
            count: 0,
            active: true,
            pausedUntil: Date.now() + 60000 // 1 minute in future
        };
        expect(shouldRuleApply(rule)).toBe(false);
    });

    test('should apply rule after pause expires', async () => {
        const duration = 100; // 100ms
        const rule: Rule = {
            id: 1,
            source: 'example.com',
            target: 'google.com',
            count: 0,
            active: true,
            pausedUntil: Date.now() + duration
        };

        // Initially paused
        expect(shouldRuleApply(rule)).toBe(false);

        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, duration + 50));

        // Should be active now
        expect(shouldRuleApply(rule)).toBe(true);
    });
});
