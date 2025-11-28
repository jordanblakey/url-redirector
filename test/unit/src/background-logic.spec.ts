import { test, expect, describe, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { buildDNRRules, findActivelyChangedRules, findMatchingTabs } from '../../../src/background-logic.js';

describe('background-logic.ts - Pure Functions', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(Date.now());
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('buildDNRRules', () => {
        test('should create DNR rules for active rules', () => {
            const rules = [
                {
                    id: 1,
                    source: 'example.com',
                    target: 'google.com',
                    active: true,
                    count: 0,
                },
            ];

            const dnrRules = buildDNRRules(rules);

            expect(dnrRules).toHaveLength(1);
            expect(dnrRules[0].condition.urlFilter).toBe('||example.com');
            expect(dnrRules[0]!.action!.redirect!.url).toBe('https://google.com');
            expect(dnrRules[0]!.priority).toBe(1);
        });

        test('should skip inactive rules', () => {
            const rules = [
                {
                    id: 1,
                    source: 'example.com',
                    target: 'google.com',
                    active: false,
                    count: 0,
                },
            ];

            const dnrRules = buildDNRRules(rules);

            expect(dnrRules).toHaveLength(0);
        });

        test('should skip paused rules', () => {
            const futureTime = Date.now() + 100000;
            const rules = [
                {
                    id: 1,
                    source: 'example.com',
                    target: 'google.com',
                    active: true,
                    count: 0,
                    pausedUntil: futureTime,
                },
            ];

            const dnrRules = buildDNRRules(rules);

            expect(dnrRules).toHaveLength(0);
        });

        test('should normalize source URL (strip protocol)', () => {
            const rules = [
                {
                    id: 1,
                    source: 'https://example.com',
                    target: 'google.com',
                    active: true,
                    count: 0,
                },
            ];

            const dnrRules = buildDNRRules(rules);

            expect(dnrRules[0].condition.urlFilter).toBe('||example.com');
        });

        test('should normalize source URL (strip www)', () => {
            const rules = [
                {
                    id: 1,
                    source: 'www.example.com',
                    target: 'google.com',
                    active: true,
                    count: 0,
                },
            ];

            const dnrRules = buildDNRRules(rules);

            expect(dnrRules[0].condition.urlFilter).toBe('||example.com');
        });

        test('should normalize source URL (strip both protocol and www)', () => {
            const rules = [
                {
                    id: 1,
                    source: 'https://www.example.com',
                    target: 'google.com',
                    active: true,
                    count: 0,
                },
            ];

            const dnrRules = buildDNRRules(rules);

            expect(dnrRules[0].condition.urlFilter).toBe('||example.com');
        });

        test('should add https protocol to target if missing', () => {
            const rules = [
                {
                    id: 1,
                    source: 'example.com',
                    target: 'google.com',
                    active: true,
                    count: 0,
                },
            ];

            const dnrRules = buildDNRRules(rules);

            expect(dnrRules[0]!.action!.redirect!.url).toBe('https://google.com');
        });

        test('should not add protocol if target already has https', () => {
            const rules = [
                {
                    id: 1,
                    source: 'example.com',
                    target: 'https://google.com',
                    active: true,
                    count: 0,
                },
            ];

            const dnrRules = buildDNRRules(rules);

            expect(dnrRules[0]!.action!.redirect!.url).toBe('https://google.com');
        });

        test('should not add protocol if target already has http', () => {
            const rules = [
                {
                    id: 1,
                    source: 'example.com',
                    target: 'http://google.com',
                    active: true,
                    count: 0,
                },
            ];

            const dnrRules = buildDNRRules(rules);

            expect(dnrRules[0]!.action!.redirect!.url).toBe('http://google.com');
        });

        test('should handle shuffle target', () => {
            const rules = [
                {
                    id: 1,
                    source: 'example.com',
                    target: ':shuffle:',
                    active: true,
                    count: 0,
                },
            ];

            const dnrRules = buildDNRRules(rules);

            expect(dnrRules).toHaveLength(1);
            expect(dnrRules[0]!.action!.redirect!.url).not.toBe(':shuffle:');
            expect(dnrRules[0]!.action!.redirect!.url).toBeTruthy();
        });

        test('should generate consistent rule IDs', () => {
            const rules = [
                {
                    id: 1,
                    source: 'example.com',
                    target: 'google.com',
                    active: true,
                    count: 0,
                },
            ];

            const dnrRules1 = buildDNRRules(rules);
            const dnrRules2 = buildDNRRules(rules);

            expect(dnrRules1[0].id).toBe(dnrRules2[0].id);
        });

        test('should handle multiple active rules', () => {
            const rules = [
                {
                    id: 1,
                    source: 'example.com',
                    target: 'google.com',
                    active: true,
                    count: 0,
                },
                {
                    id: 2,
                    source: 'test.com',
                    target: 'bing.com',
                    active: true,
                    count: 0,
                },
            ];

            const dnrRules = buildDNRRules(rules);

            expect(dnrRules).toHaveLength(2);
        });

        test('should filter out inactive from mixed rules', () => {
            const rules = [
                {
                    id: 1,
                    source: 'example.com',
                    target: 'google.com',
                    active: true,
                    count: 0,
                },
                {
                    id: 2,
                    source: 'test.com',
                    target: 'bing.com',
                    active: false,
                    count: 0,
                },
            ];

            const dnrRules = buildDNRRules(rules);

            expect(dnrRules).toHaveLength(1);
            expect(dnrRules[0].condition.urlFilter).toBe('||example.com');
        });
    });

    describe('findActivelyChangedRules', () => {
        test('should find newly activated rules', () => {
            const oldRules = [
                {
                    id: 1,
                    source: 'example.com',
                    target: 'google.com',
                    active: false,
                    count: 0,
                },
            ];

            const newRules = [
                {
                    id: 1,
                    source: 'example.com',
                    target: 'google.com',
                    active: true,
                    count: 0,
                },
            ];

            const activeRules = findActivelyChangedRules(newRules, oldRules);

            expect(activeRules).toHaveLength(1);
            expect(activeRules[0].id).toBe(1);
        });

        test('should find newly unpaused rules', () => {
            const futureTime = Date.now() + 100000;
            const oldRules = [
                {
                    id: 1,
                    source: 'example.com',
                    target: 'google.com',
                    active: true,
                    count: 0,
                    pausedUntil: futureTime,
                },
            ];

            const newRules = [
                {
                    id: 1,
                    source: 'example.com',
                    target: 'google.com',
                    active: true,
                    count: 0,
                    pausedUntil: undefined,
                },
            ];

            const activeRules = findActivelyChangedRules(newRules, oldRules);

            expect(activeRules).toHaveLength(1);
        });

        test('should not include rules that were already active', () => {
            const oldRules = [
                {
                    id: 1,
                    source: 'example.com',
                    target: 'google.com',
                    active: true,
                    count: 0,
                },
            ];

            const newRules = [
                {
                    id: 1,
                    source: 'example.com',
                    target: 'google.com',
                    active: true,
                    count: 0,
                },
            ];

            const activeRules = findActivelyChangedRules(newRules, oldRules);

            expect(activeRules).toHaveLength(0);
        });

        test('should handle new rules (not in old list)', () => {
            const oldRules: any[] = [];

            const newRules = [
                {
                    id: 1,
                    source: 'example.com',
                    target: 'google.com',
                    active: true,
                    count: 0,
                },
            ];

            const activeRules = findActivelyChangedRules(newRules, oldRules);

            expect(activeRules).toHaveLength(1);
        });

        test('should handle multiple rules becoming active', () => {
            const oldRules = [
                {
                    id: 1,
                    source: 'example.com',
                    target: 'google.com',
                    active: false,
                    count: 0,
                },
                {
                    id: 2,
                    source: 'test.com',
                    target: 'bing.com',
                    active: false,
                    count: 0,
                },
            ];

            const newRules = [
                {
                    id: 1,
                    source: 'example.com',
                    target: 'google.com',
                    active: true,
                    count: 0,
                },
                {
                    id: 2,
                    source: 'test.com',
                    target: 'bing.com',
                    active: true,
                    count: 0,
                },
            ];

            const activeRules = findActivelyChangedRules(newRules, oldRules);

            expect(activeRules).toHaveLength(2);
        });
    });

    describe('findMatchingTabs', () => {
        test('should find matching tabs', () => {
            const tabs = [
                { id: 1, url: 'https://example.com' },
                { id: 2, url: 'https://google.com' },
            ];

            const rules = [
                {
                    id: 1,
                    source: 'example.com',
                    target: 'redirect.com',
                    active: true,
                    count: 5,
                },
            ];

            const redirects = findMatchingTabs(tabs, rules);

            expect(redirects).toHaveLength(1);
            expect(redirects[0].tabId).toBe(1);
            expect(redirects[0].targetUrl).toContain('redirect.com');
            expect(redirects[0].ruleId).toBe(1);
            expect(redirects[0].ruleCount).toBe(5);
        });

        test('should skip tabs without URL', () => {
            const tabs = [
                { id: 1, url: undefined },
            ];

            const rules = [
                {
                    id: 1,
                    source: 'example.com',
                    target: 'redirect.com',
                    active: true,
                    count: 0,
                },
            ];

            const redirects = findMatchingTabs(tabs, rules);

            expect(redirects).toHaveLength(0);
        });

        test('should skip tabs without ID', () => {
            const tabs = [
                { id: undefined, url: 'https://example.com' },
            ];

            const rules = [
                {
                    id: 1,
                    source: 'example.com',
                    target: 'redirect.com',
                    active: true,
                    count: 0,
                },
            ];

            const redirects = findMatchingTabs(tabs, rules);

            expect(redirects).toHaveLength(0);
        });

        test('should only match first rule per tab', () => {
            const tabs = [
                { id: 1, url: 'https://example.com' },
            ];

            const rules = [
                {
                    id: 1,
                    source: 'example.com',
                    target: 'redirect1.com',
                    active: true,
                    count: 0,
                },
                {
                    id: 2,
                    source: 'example.com',
                    target: 'redirect2.com',
                    active: true,
                    count: 0,
                },
            ];

            const redirects = findMatchingTabs(tabs, rules);

            expect(redirects).toHaveLength(1);
            expect(redirects[0].targetUrl).toContain('redirect1.com');
        });

        test('should handle multiple tabs matching different rules', () => {
            const tabs = [
                { id: 1, url: 'https://example.com' },
                { id: 2, url: 'https://test.com' },
            ];

            const rules = [
                {
                    id: 1,
                    source: 'example.com',
                    target: 'redirect1.com',
                    active: true,
                    count: 0,
                },
                {
                    id: 2,
                    source: 'test.com',
                    target: 'redirect2.com',
                    active: true,
                    count: 0,
                },
            ];

            const redirects = findMatchingTabs(tabs, rules);

            expect(redirects).toHaveLength(2);
        });

        test('should not match non-matching tabs', () => {
            const tabs = [
                { id: 1, url: 'https://nomatch.com' },
            ];

            const rules = [
                {
                    id: 1,
                    source: 'example.com',
                    target: 'redirect.com',
                    active: true,
                    count: 0,
                },
            ];

            const redirects = findMatchingTabs(tabs, rules);

            expect(redirects).toHaveLength(0);
        });
    });
});
