import { test, expect } from '@playwright/test';
import { matchAndGetTarget, shouldRuleApply, isValidUrl } from '../../src/utils.js';


test.describe('URL Matching Logic', () => {
    test('should return target for exact match', () => {
        const rule = { id: 1, source: 'example.com', target: 'google.com', count: 0, active: true };
        const url = 'https://example.com';
        expect(matchAndGetTarget(url, rule)).toBe('https://google.com');
    });

    test('should return target for match with different protocol', () => {
        const rule = { id: 1, source: 'example.com', target: 'google.com', count: 0, active: true };
        const url = 'http://example.com';
        expect(matchAndGetTarget(url, rule)).toBe('https://google.com');
    });

    test('should return target for match with path', () => {
        const rule = { id: 1, source: 'example.com', target: 'google.com', count: 0, active: true };
        const url = 'https://example.com/foo/bar';
        expect(matchAndGetTarget(url, rule)).toBe('https://google.com');
    });

    test('should return null for no match', () => {
        const rule = { id: 1, source: 'example.com', target: 'google.com', count: 0, active: true };
        const url = 'https://other.com';
        expect(matchAndGetTarget(url, rule)).toBeNull();
    });

    test('should return null if target loop detected (source contained in url)', () => {
        // If source is example.com and target is google.com
        // And we are on google.com, it shouldn't redirect again?
        // No, the logic checks if *currentUrl* includes *target*.
        const rule = { id: 1, source: 'example.com', target: 'google.com', count: 0, active: true };
        const url = 'https://google.com';
        expect(matchAndGetTarget(url, rule)).toBeNull();
    });

    test('should return null for infinite loop where target is same as source', () => {
        const rule = { id: 1, source: 'example.com', target: 'example.com', count: 0, active: true };
        const url = 'https://example.com';
        // If target is example.com -> https://example.com
        // currentUrl is https://example.com
        // currentUrl.includes(target) -> true
        expect(matchAndGetTarget(url, rule)).toBeNull();
    });

    test('should handle user input without protocol', () => {
        const rule = { id: 1, source: 'example.com', target: 'google.com', count: 0, active: true };
        expect(matchAndGetTarget('https://example.com', rule)).toBe('https://google.com');
    });

    test('should handle user input with www', () => {
        const rule = { id: 1, source: 'www.example.com', target: 'google.com', count: 0, active: true };
        // logic removes www. from source
        expect(matchAndGetTarget('https://example.com', rule)).toBe('https://google.com');
        expect(matchAndGetTarget('https://www.example.com', rule)).toBe('https://google.com');
    });
});

test.describe('Rule Application Logic', () => {
    test('should apply active rule', () => {
        const rule = { id: 1, source: 'src', target: 'tgt', active: true };
        expect(shouldRuleApply(rule)).toBe(true);
    });

    test('should not apply inactive rule', () => {
        const rule = { id: 1, source: 'src', target: 'tgt', active: false };
        expect(shouldRuleApply(rule)).toBe(false);
    });

    test('should not apply paused rule (future)', () => {
        const futureTime = Date.now() + 100000;
        const rule = { id: 1, source: 'src', target: 'tgt', active: true, pausedUntil: futureTime };
        expect(shouldRuleApply(rule)).toBe(false);
    });

    test('should apply paused rule (past)', () => {
        const pastTime = Date.now() - 100000;
        const rule = { id: 1, source: 'src', target: 'tgt', active: true, pausedUntil: pastTime };
        expect(shouldRuleApply(rule)).toBe(true);
    });
});

test.describe('URL Validation Logic', () => {
    test('should validate standard URLs', () => {
        expect(isValidUrl('https://example.com')).toBe(true);
        expect(isValidUrl('http://example.com')).toBe(true);
    });

    test('should validate domains without protocol', () => {
        expect(isValidUrl('example.com')).toBe(true);
        expect(isValidUrl('sub.example.com')).toBe(true);
    });

    test('should validate URLs with paths and params', () => {
        expect(isValidUrl('example.com/foo/bar')).toBe(true);
        expect(isValidUrl('example.com?q=123')).toBe(true);
        expect(isValidUrl('example.com#section')).toBe(true);
    });

    test('should validate localhost', () => {
        expect(isValidUrl('http://localhost:3000')).toBe(true);
    });

    test('should invalidate empty strings', () => {
        expect(isValidUrl('')).toBe(false);
    });

    test('should invalidate random text that is not a domain', () => {
        expect(isValidUrl('hello world')).toBe(false);
    });

    test('should invalidate strings with spaces in domain part', () => {
        expect(isValidUrl('exa mple.com')).toBe(false);
    });
});
