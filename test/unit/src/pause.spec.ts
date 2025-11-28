import { test, expect, describe, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { Rule } from '../../../src/types';
import { shouldRuleApply } from '../../../src/utils';

describe('Pause Functionality', () => {
  test('should apply rule if not paused and active', () => {
    const rule: Rule = {
      id: 1,
      source: 'example.com',
      target: 'google.com',
      count: 0,
      active: true,
    };
    expect(shouldRuleApply(rule)).toBe(true);
  });

  test('should not apply rule if inactive', () => {
    const rule: Rule = {
      id: 1,
      source: 'example.com',
      target: 'google.com',
      count: 0,
      active: false,
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
      pausedUntil: Date.now() + 60000, // 1 minute in future
    };
    expect(shouldRuleApply(rule)).toBe(false);
  });

  test('should apply rule after pause expires', () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    const duration = 100; // 100ms
    const rule: Rule = {
      id: 1,
      source: 'example.com',
      target: 'google.com',
      count: 0,
      active: true,
      pausedUntil: now + duration,
    };

    // Initially paused
    expect(shouldRuleApply(rule)).toBe(false);

    // Advance time past duration
    vi.advanceTimersByTime(duration + 1);

    // Should be active now
    expect(shouldRuleApply(rule)).toBe(true);

    vi.useRealTimers();
  });
});
