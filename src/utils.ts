import { Rule } from './types';
import { getRandomProductiveUrl } from './suggestions.js';

/**
 * Checks if the given URL matches the rule's source.
 * @param url The current URL to check.
 * @param rule The rule containing source and target.
 * @returns The target URL if matched, otherwise null.
 */
export function matchAndGetTarget(url: string, rule: Rule): string | null {
    // Normalize URLs for comparison
    // If user enters "example.com", we match "http://example.com", "https://example.com", "https://example.com/foo"

    let source = rule.source.toLowerCase();
    source = source.replace(/^https?:\/\//, '');
    source = source.replace(/^www\./, '');

    const currentUrlLower = url.toLowerCase();
    let currentUrlClean = currentUrlLower.replace(/^https?:\/\//, '');
    currentUrlClean = currentUrlClean.replace(/^www\./, '');

    if (currentUrlClean.startsWith(source)) {
        let target = rule.target;

        if (target === ':shuffle:') {
            target = getRandomProductiveUrl();
        }

        if (!target.startsWith('http')) {
            target = 'https://' + target;
        }

        // Avoid infinite redirect loops if target is same as source (or contained in it)
        if (url.includes(target)) {
            return null;
        }

        return target;
    }
    return null;
}

/**
 * Checks if a rule is active and not paused.
 * @param rule The rule to check.
 * @returns True if the rule should apply, false otherwise.
 */
export function shouldRuleApply(rule: Rule): boolean {
    if (rule.active === false) return false;
    if (rule.pausedUntil && Date.now() < rule.pausedUntil) return false;
    return true;
}

/**
 * Validates if the given string is a valid URL or domain.
 * @param string The string to validate.
 * @returns True if valid, false otherwise.
 */
export function isValidUrl(string: string): boolean {
    try {
        // Check if it matches a basic domain pattern or full URL
        // Improved pattern to allow query parameters and fragments
        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?(\?.*)?(#.*)?$/;
        if (urlPattern.test(string)) {
            return true;
        }
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}
