import { test, expect, describe, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { toggleRuleState, getFaviconUrl } from '../../../src/ui.js';
import { Rule } from '../../../src/types';

describe('UI Logic - toggleRuleState', () => {
  test('should pause an active rule', () => {
    const rule: Rule = {
      id: 1,
      source: 'src',
      target: 'tgt',
      active: true,
      count: 0,
      pausedUntil: undefined,
    };

    const now = Date.now();
    toggleRuleState(rule);

    expect(rule.active).toBe(true); // Still active in definition, but has pausedUntil
    expect(rule.pausedUntil).toBeGreaterThan(now);
    // Default pause is 5 minutes
    expect(rule.pausedUntil).toBeLessThanOrEqual(now + 5 * 60 * 1000 + 1000);
  });

  test('should resume a paused rule', () => {
    const futureTime = Date.now() + 100000;
    const rule: Rule = {
      id: 1,
      source: 'src',
      target: 'tgt',
      active: true,
      count: 0,
      pausedUntil: futureTime,
    };

    toggleRuleState(rule);

    expect(rule.active).toBe(true);
    expect(rule.pausedUntil).toBeUndefined();
  });

  test('should activate an inactive rule', () => {
    const rule: Rule = {
      id: 1,
      source: 'src',
      target: 'tgt',
      active: false,
      count: 0,
      pausedUntil: undefined,
    };

    toggleRuleState(rule);

    expect(rule.active).toBe(true);
    expect(rule.pausedUntil).toBeUndefined();
  });
});

describe('UI Logic - getFaviconUrl', () => {
  test('should generate correct Google S2 URL for standard domain', () => {
    const url = 'https://example.com';
    const iconUrl = getFaviconUrl(url);
    expect(iconUrl).toBe('https://www.google.com/s2/favicons?domain=example.com&sz=32');
  });

  test('should handle URL without protocol', () => {
    const url = 'example.com';
    const iconUrl = getFaviconUrl(url);
    expect(iconUrl).toBe('https://www.google.com/s2/favicons?domain=example.com&sz=32');
  });

  test('should handle URL with path', () => {
    const url = 'https://example.com/foo/bar';
    const iconUrl = getFaviconUrl(url);
    expect(iconUrl).toBe('https://www.google.com/s2/favicons?domain=example.com&sz=32');
  });

  test('should return fallback for invalid URL', () => {
    const url = 'not-a-url';
    // The URL constructor might accept 'not-a-url' as relative path if base is provided,
    // but here it throws or treats it weirdly. In Node, new URL('not-a-url') throws TypeError.
    // However, existing code does: new URL(url.startsWith('http') ? url : `https://${url}`)
    // `https://not-a-url` is technically a valid URL structure (hostname 'not-a-url').

    // Let's try something that definitely fails URL parsing or returns empty domain?
    // Actually the code uses `try...catch`.
    // `new URL('https://')` throws.

    const iconUrl = getFaviconUrl('');
    expect(iconUrl).toBe('default-icon.png');
  });
});
