import { test, expect } from '@playwright/test';
import { matchAndGetTarget } from '../../src/utils.js'; // This might require some setup if utils.ts is TS.
// Since Playwright supports TS, this should be fine if the import path is correct.
// However, utils.ts is in src.
// We might need to adjust import or use the dist version if we were running in node.
// But Playwright test runner handles TS.

test.describe('URL Matching Logic', () => {
    test('should return target for exact match', () => {
        const rule = { id: 1, source: 'example.com', target: 'google.com', count: 0 };
        const url = 'https://example.com';
        expect(matchAndGetTarget(url, rule)).toBe('https://google.com');
    });

    test('should return target for match with different protocol', () => {
        const rule = { id: 1, source: 'example.com', target: 'google.com', count: 0 };
        const url = 'http://example.com';
        expect(matchAndGetTarget(url, rule)).toBe('https://google.com');
    });

    test('should return target for match with path', () => {
        const rule = { id: 1, source: 'example.com', target: 'google.com', count: 0 };
        const url = 'https://example.com/foo/bar';
        expect(matchAndGetTarget(url, rule)).toBe('https://google.com');
    });

    test('should return null for no match', () => {
        const rule = { id: 1, source: 'example.com', target: 'google.com', count: 0 };
        const url = 'https://other.com';
        expect(matchAndGetTarget(url, rule)).toBeNull();
    });

    test('should return null if target loop detected (source contained in url)', () => {
        // If source is example.com and target is google.com
        // And we are on google.com, it shouldn't redirect again?
        // No, the logic checks if *currentUrl* includes *target*.
        const rule = { id: 1, source: 'example.com', target: 'google.com', count: 0 };
        const url = 'https://google.com';
        expect(matchAndGetTarget(url, rule)).toBeNull();
    });

    test('should return null for infinite loop where target is same as source', () => {
        const rule = { id: 1, source: 'example.com', target: 'example.com', count: 0 };
        const url = 'https://example.com';
        // If target is example.com -> https://example.com
        // currentUrl is https://example.com
        // currentUrl.includes(target) -> true
        expect(matchAndGetTarget(url, rule)).toBeNull();
    });

    test('should handle user input without protocol', () => {
        const rule = { id: 1, source: 'example.com', target: 'google.com', count: 0 };
        expect(matchAndGetTarget('https://example.com', rule)).toBe('https://google.com');
    });

    test('should handle user input with www', () => {
        const rule = { id: 1, source: 'www.example.com', target: 'google.com', count: 0 };
        // logic removes www. from source
        expect(matchAndGetTarget('https://example.com', rule)).toBe('https://google.com');
        expect(matchAndGetTarget('https://www.example.com', rule)).toBe('https://google.com');
    });
});
