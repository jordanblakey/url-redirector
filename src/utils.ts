import { Rule } from './types';

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
