import { test, expect } from '../fixtures';
import {
    getFaviconUrl,
    shouldShowFavicon,
    formatPauseButtonText,
    formatRemainingTime,
    isRulePaused,
    shouldDisplayAsPaused,
    getTargetDisplayText,
    getCountMessage,
    sortRulesBySource,
    extractPlaceholderValue,
    getNextRuleState,
} from '../../src/ui-logic.js';

test.describe('ui-logic.ts - Pure Functions', () => {
    test.describe('getFaviconUrl', () => {
        test('should generate favicon URL for domain with http', () => {
            const url = getFaviconUrl('http://example.com');
            expect(url).toBe('https://www.google.com/s2/favicons?domain=example.com&sz=32');
        });

        test('should generate favicon URL for domain without protocol', () => {
            const url = getFaviconUrl('example.com');
            expect(url).toBe('https://www.google.com/s2/favicons?domain=example.com&sz=32');
        });

        test('should handle invalid URLs gracefully', () => {
            const url = getFaviconUrl('not a valid url!!!');
            expect(url).toBe('default-icon.png');
        });

        test('should extract domain from URL with path', () => {
            const url = getFaviconUrl('https://example.com/some/path');
            expect(url).toBe('https://www.google.com/s2/favicons?domain=example.com&sz=32');
        });
    });

    test.describe('shouldShowFavicon', () => {
        test('should return true for normal URLs', () => {
            expect(shouldShowFavicon('google.com')).toBe(true);
            expect(shouldShowFavicon('https://example.com')).toBe(true);
        });

        test('should return false for shuffle target', () => {
            expect(shouldShowFavicon(':shuffle:')).toBe(false);
        });
    });

    test.describe('formatPauseButtonText', () => {
        test('should return "Pause" for active rule', () => {
            const rule = { id: 1, source: 'a', target: 'b', active: true, count: 0 };
            expect(formatPauseButtonText(rule)).toBe('Pause');
        });

        test('should return "Play" for inactive rule', () => {
            const rule = { id: 1, source: 'a', target: 'b', active: false, count: 0 };
            expect(formatPauseButtonText(rule)).toBe('Play');
        });

        test('should show remaining seconds for paused rule (< 60s)', () => {
            const futureTime = Date.now() + 30 * 1000; // 30 seconds
            const rule = { id: 1, source: 'a', target: 'b', active: true, count: 0, pausedUntil: futureTime };
            const text = formatPauseButtonText(rule);
            expect(text).toMatch(/Paused \(\d+s\)/);
        });

        test('should show remaining minutes for paused rule (> 60s)', () => {
            const futureTime = Date.now() + 120 * 1000; // 2 minutes
            const rule = { id: 1, source: 'a', target: 'b', active: true, count: 0, pausedUntil: futureTime };
            const text = formatPauseButtonText(rule);
            expect(text).toMatch(/Paused \(\d+m\)/);
        });
    });

    test.describe('formatRemainingTime', () => {
        test('should format seconds correctly', () => {
            const pausedUntil = Date.now() + 45 * 1000;
            const text = formatRemainingTime(pausedUntil);
            expect(text).toMatch(/Paused \(\d+s\)/);
        });

        test('should format minutes correctly', () => {
            const pausedUntil = Date.now() + 180 * 1000; // 3 minutes
            const text = formatRemainingTime(pausedUntil);
            expect(text).toMatch(/Paused \(3m\)/);
        });
    });

    test.describe('isRulePaused', () => {
        test('should return true for paused rule', () => {
            const futureTime = Date.now() + 100000;
            const rule = { id: 1, source: 'a', target: 'b', active: true, count: 0, pausedUntil: futureTime };
            expect(isRulePaused(rule)).toBe(true);
        });

        test('should return false for active rule', () => {
            const rule = { id: 1, source: 'a', target: 'b', active: true, count: 0 };
            expect(isRulePaused(rule)).toBe(false);
        });

        test('should return false for expired pause', () => {
            const pastTime = Date.now() - 100000;
            const rule = { id: 1, source: 'a', target: 'b', active: true, count: 0, pausedUntil: pastTime };
            expect(isRulePaused(rule)).toBe(false);
        });
    });

    test.describe('shouldDisplayAsPaused', () => {
        test('should return true for inactive rule', () => {
            const rule = { id: 1, source: 'a', target: 'b', active: false, count: 0 };
            expect(shouldDisplayAsPaused(rule)).toBe(true);
        });

        test('should return true for paused rule', () => {
            const futureTime = Date.now() + 100000;
            const rule = { id: 1, source: 'a', target: 'b', active: true, count: 0, pausedUntil: futureTime };
            expect(shouldDisplayAsPaused(rule)).toBe(true);
        });

        test('should return false for active, unpaused rule', () => {
            const rule = { id: 1, source: 'a', target: 'b', active: true, count: 0 };
            expect(shouldDisplayAsPaused(rule)).toBe(false);
        });
    });

    test.describe('getTargetDisplayText', () => {
        test('should return shuffle emoji for shuffle target', () => {
            expect(getTargetDisplayText(':shuffle:')).toBe('🔀 shuffle');
        });

        test('should return target as-is for normal URLs', () => {
            expect(getTargetDisplayText('google.com')).toBe('google.com');
            expect(getTargetDisplayText('https://example.com')).toBe('https://example.com');
        });
    });

    test.describe('getCountMessage', () => {
        test('should return lastCountMessage if present', () => {
            const rule = { id: 1, source: 'a', target: 'b', active: true, count: 5, lastCountMessage: 'Custom message!' };
            expect(getCountMessage(rule)).toBe('Custom message!');
        });

        test('should return generated message if no lastCountMessage', () => {
            const rule = { id: 1, source: 'a', target: 'b', active: true, count: 0 };
            const message = getCountMessage(rule);
            expect(message).toBeTruthy();
            expect(typeof message).toBe('string');
        });
    });

    test.describe('sortRulesBySource', () => {
        test('should sort rules alphabetically by source', () => {
            const rules = [
                { id: 1, source: 'zebra.com', target: 'b', active: true, count: 0 },
                { id: 2, source: 'apple.com', target: 'b', active: true, count: 0 },
                { id: 3, source: 'microsoft.com', target: 'b', active: true, count: 0 },
            ];

            const sorted = sortRulesBySource(rules);

            expect(sorted[0].source).toBe('apple.com');
            expect(sorted[1].source).toBe('microsoft.com');
            expect(sorted[2].source).toBe('zebra.com');
        });

        test('should not mutate original array', () => {
            const rules = [
                { id: 1, source: 'zebra.com', target: 'b', active: true, count: 0 },
                { id: 2, source: 'apple.com', target: 'b', active: true, count: 0 },
            ];

            const sorted = sortRulesBySource(rules);

            expect(rules[0].source).toBe('zebra.com'); // Original unchanged
            expect(sorted[0].source).toBe('apple.com'); // Sorted
        });
    });

    test.describe('extractPlaceholderValue', () => {
        test('should extract value after "e.g. " prefix', () => {
            expect(extractPlaceholderValue('e.g. example.com')).toBe('example.com');
            expect(extractPlaceholderValue('E.G. test.com')).toBe('test.com');
        });

        test('should return placeholder as-is if no prefix', () => {
            expect(extractPlaceholderValue('example.com')).toBe('example.com');
            expect(extractPlaceholderValue('some text')).toBe('some text');
        });
    });

    test.describe('getNextRuleState', () => {
        test('should resume paused rule', () => {
            const futureTime = Date.now() + 100000;
            const rule = { id: 1, source: 'a', target: 'b', active: true, count: 0, pausedUntil: futureTime };
            const nextState = getNextRuleState(rule);

            expect(nextState.pausedUntil).toBeUndefined();
            expect(nextState.active).toBe(true);
        });

        test('should enable inactive rule', () => {
            const rule = { id: 1, source: 'a', target: 'b', active: false, count: 0 };
            const nextState = getNextRuleState(rule);

            expect(nextState.active).toBe(true);
            expect(nextState.pausedUntil).toBeUndefined();
        });

        test('should pause active rule for 5 minutes', () => {
            const rule = { id: 1, source: 'a', target: 'b', active: true, count: 0 };
            const nextState = getNextRuleState(rule);

            expect(nextState.pausedUntil).toBeDefined();
            expect(nextState.pausedUntil).toBeGreaterThan(Date.now());

            // Should be approximately 5 minutes (allow 1 second tolerance)
            const fiveMinutes = 5 * 60 * 1000;
            const diff = (nextState.pausedUntil || 0) - Date.now();
            expect(diff).toBeGreaterThan(fiveMinutes - 1000);
            expect(diff).toBeLessThan(fiveMinutes + 1000);
        });
    });
});
