import { test, expect, describe, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import {
  buildDNRRules,
  findActivelyChangedRules,
  findMatchingTabs,
} from '../../../src/background-logic.js';
import { Rule } from '../../../src/types';
import { generateRuleId } from '../../../src/utils.js';

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
      const rules: Rule[] = [
        {
          id: 1,
          source: 'example.com',
          target: 'google.com',
          active: true,
          count: 0,
        },
      ];

      const dnrRules = buildDNRRules(rules);

      expect(dnrRules).toHaveLength(2);
      expect(dnrRules[0].priority).toBe(2);
      expect(dnrRules[0].condition.regexFilter).toContain('example\\.com');
      const id = generateRuleId('example.com');
      expect(dnrRules[0]!.action!.redirect!.regexSubstitution).toContain(
        `url_redirector=\\3,${id}`,
      );
      expect(dnrRules[1].priority).toBe(1);
      expect(dnrRules[1].condition.regexFilter).toContain('example\\.com');
      expect(dnrRules[1]!.action!.redirect!.regexSubstitution).toContain(`url_redirector=${id}`);
    });

    test('should skip inactive rules', () => {
      const rules: Rule[] = [
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
      const rules: Rule[] = [
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
      const rules: Rule[] = [
        {
          id: 1,
          source: 'https://example.com',
          target: 'google.com',
          active: true,
          count: 0,
        },
      ];

      const dnrRules = buildDNRRules(rules);

      expect(dnrRules[0].condition.regexFilter).toContain('example\\.com');
    });

    test('should normalize source URL (strip www)', () => {
      const rules: Rule[] = [
        {
          id: 1,
          source: 'www.example.com',
          target: 'google.com',
          active: true,
          count: 0,
        },
      ];

      const dnrRules = buildDNRRules(rules);

      expect(dnrRules[0].condition.regexFilter).toContain('example\\.com');
    });

    test('should normalize source URL (strip both protocol and www)', () => {
      const rules: Rule[] = [
        {
          id: 1,
          source: 'https://www.example.com',
          target: 'google.com',
          active: true,
          count: 0,
        },
      ];

      const dnrRules = buildDNRRules(rules);

      expect(dnrRules[0].condition.regexFilter).toContain('example\\.com');
    });

    test('should add https protocol to target if missing', () => {
      const rules: Rule[] = [
        {
          id: 1,
          source: 'example.com',
          target: 'google.com',
          active: true,
          count: 0,
        },
      ];

      const dnrRules = buildDNRRules(rules);

      const id = generateRuleId('example.com');
      expect(dnrRules[1]!.action!.redirect!.regexSubstitution).toBe(
        `https://google.com?url_redirector=${id}`,
      );
    });

    test('should not add protocol if target already has https', () => {
      const rules: Rule[] = [
        {
          id: 1,
          source: 'example.com',
          target: 'https://google.com',
          active: true,
          count: 0,
        },
      ];

      const dnrRules = buildDNRRules(rules);

      const id = generateRuleId('example.com');
      expect(dnrRules[1]!.action!.redirect!.regexSubstitution).toBe(
        `https://google.com?url_redirector=${id}`,
      );
    });

    test('should not add protocol if target already has http', () => {
      const rules: Rule[] = [
        {
          id: 1,
          source: 'example.com',
          target: 'http://google.com',
          active: true,
          count: 0,
        },
      ];

      const dnrRules = buildDNRRules(rules);

      const id = generateRuleId('example.com');
      expect(dnrRules[1]!.action!.redirect!.regexSubstitution).toBe(
        `http://google.com?url_redirector=${id}`,
      );
    });

    test('should handle shuffle target', () => {
      const rules: Rule[] = [
        {
          id: 1,
          source: 'example.com',
          target: ':shuffle:',
          active: true,
          count: 0,
        },
      ];

      const dnrRules = buildDNRRules(rules);

      expect(dnrRules).toHaveLength(2);
      expect(dnrRules[0]!.action!.redirect!.regexSubstitution).not.toBe(':shuffle:');
      expect(dnrRules[0]!.action!.redirect!.regexSubstitution).toBeTruthy();
    });

    test('should generate consistent rule IDs', () => {
      const rules: Rule[] = [
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
      const rules: Rule[] = [
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

      expect(dnrRules).toHaveLength(4);
    });

    test('should filter out inactive from mixed rules', () => {
      const rules: Rule[] = [
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

      expect(dnrRules).toHaveLength(2);
      expect(dnrRules[0].condition.regexFilter).toContain('example\\.com');
    });
  });

  describe('findActivelyChangedRules', () => {
    test('should find newly activated rules', () => {
      const oldRules: Rule[] = [
        {
          id: 1,
          source: 'example.com',
          target: 'google.com',
          active: false,
          count: 0,
        },
      ];

      const newRules: Rule[] = [
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
      const oldRules: Rule[] = [
        {
          id: 1,
          source: 'example.com',
          target: 'google.com',
          active: true,
          count: 0,
          pausedUntil: futureTime,
        },
      ];

      const newRules: Rule[] = [
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
      const oldRules: Rule[] = [
        {
          id: 1,
          source: 'example.com',
          target: 'google.com',
          active: true,
          count: 0,
        },
      ];

      const newRules: Rule[] = [
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
      const oldRules: Rule[] = [];

      const newRules: Rule[] = [
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
      const oldRules: Rule[] = [
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

      const newRules: Rule[] = [
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
      const tabs: { id?: number; url?: string }[] = [
        { id: 1, url: 'https://example.com' },
        { id: 2, url: 'https://google.com' },
      ];

      const rules: Rule[] = [
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
      const tabs: { id?: number; url?: string }[] = [{ id: 1, url: undefined }];

      const rules: Rule[] = [
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
      const tabs: { id?: number; url?: string }[] = [{ id: undefined, url: 'https://example.com' }];

      const rules: Rule[] = [
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
      const tabs: { id?: number; url?: string }[] = [{ id: 1, url: 'https://example.com' }];

      const rules: Rule[] = [
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
      const tabs: { id?: number; url?: string }[] = [
        { id: 1, url: 'https://example.com' },
        { id: 2, url: 'https://test.com' },
      ];

      const rules: Rule[] = [
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
      const tabs: { id?: number; url?: string }[] = [{ id: 1, url: 'https://nomatch.com' }];

      const rules: Rule[] = [
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
