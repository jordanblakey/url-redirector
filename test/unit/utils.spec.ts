
import { test, expect } from '../fixtures';
import { matchAndGetTarget, shouldRuleApply, isValidUrl, generateRuleId } from '../../src/utils';
import { Rule } from '../../src/types';

test.describe('Utils', () => {

    test.describe('matchAndGetTarget', () => {
        const baseRule: Rule = {
            id: 1,
            source: 'facebook.com',
            target: 'google.com',
            active: true,
            count: 0,
            lastCountMessage: ''
        };

        test('should match exact source', () => {
            expect(matchAndGetTarget('facebook.com', baseRule)).toBe('https://google.com');
            expect(matchAndGetTarget('http://facebook.com', baseRule)).toBe('https://google.com');
            expect(matchAndGetTarget('https://facebook.com', baseRule)).toBe('https://google.com');
            expect(matchAndGetTarget('https://www.facebook.com', baseRule)).toBe('https://google.com');
        });

        test('should match sub-paths', () => {
            expect(matchAndGetTarget('facebook.com/messages', baseRule)).toBe('https://google.com');
        });

        test('should return null for non-matching URLs', () => {
            expect(matchAndGetTarget('twitter.com', baseRule)).toBeNull();
            expect(matchAndGetTarget('myfacebook.com', baseRule)).toBeNull(); // Should not match suffix
        });

        test('should handle :shuffle: target', () => {
            const shuffleRule = { ...baseRule, target: ':shuffle:' };
            const target = matchAndGetTarget('facebook.com', shuffleRule);
            expect(target).not.toBeNull();
            expect(target).not.toBe(':shuffle:');
            expect(target?.startsWith('http')).toBe(true);
        });

        test('should prevent infinite loops', () => {
            const loopRule = { ...baseRule, target: 'facebook.com' };
            // Use full URL to match how target is normalized (https://facebook.com)
            expect(matchAndGetTarget('https://facebook.com', loopRule)).toBeNull();

            const nestedLoopRule = { ...baseRule, target: 'facebook.com/home' };
            expect(matchAndGetTarget('https://facebook.com', nestedLoopRule)).toBeNull();
        });

        test('should add protocol to target if missing', () => {
            const noProtocolRule = { ...baseRule, target: 'example.com' };
            expect(matchAndGetTarget('facebook.com', noProtocolRule)).toBe('https://example.com');
        });

        test('should keep protocol if present', () => {
            const protocolRule = { ...baseRule, target: 'http://example.com' };
            expect(matchAndGetTarget('facebook.com', protocolRule)).toBe('http://example.com');
        });
    });

    test.describe('shouldRuleApply', () => {
        test('should return true for active rule', () => {
            const rule: Rule = { id: 1, source: 'a', target: 'b', active: true, count: 0 };
            expect(shouldRuleApply(rule)).toBe(true);
        });

        test('should return false for inactive rule', () => {
            const rule: Rule = { id: 1, source: 'a', target: 'b', active: false, count: 0 };
            expect(shouldRuleApply(rule)).toBe(false);
        });

        test('should return false if pausedUntil is in the future', () => {
            const future = Date.now() + 10000;
            const rule: Rule = { id: 1, source: 'a', target: 'b', active: true, pausedUntil: future, count: 0 };
            expect(shouldRuleApply(rule)).toBe(false);
        });

        test('should return true if pausedUntil is in the past', () => {
            const past = Date.now() - 10000;
            const rule: Rule = { id: 1, source: 'a', target: 'b', active: true, pausedUntil: past, count: 0 };
            expect(shouldRuleApply(rule)).toBe(true);
        });
    });

    test.describe('isValidUrl', () => {
        test('should validate correct URLs', () => {
            expect(isValidUrl('google.com')).toBe(true);
            expect(isValidUrl('https://google.com')).toBe(true);
            expect(isValidUrl('sub.domain.co.uk')).toBe(true);
        });

        test('should invalidate bad strings', () => {
            expect(isValidUrl('not a url')).toBe(false);
            expect(isValidUrl('')).toBe(false);
        });
    });

    test.describe('generateRuleId', () => {
        test('should generate consistent IDs', () => {
            const id1 = generateRuleId('example.com');
            const id2 = generateRuleId('example.com');
            expect(id1).toBe(id2);
        });

        test('should generate different IDs for different URLs', () => {
            const id1 = generateRuleId('example.com');
            const id2 = generateRuleId('google.com');
            expect(id1).not.toBe(id2);
        });

        test('should return 0 for empty string', () => {
            expect(generateRuleId('')).toBe(0);
        });
    });
});
