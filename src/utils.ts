import { Rule } from './types';
import { getRandomProductiveUrl } from './suggestions.js';

/**
 * Checks if the given URL matches the rule's source.
 * @param url The current URL to check.
 * @param rule The rule containing source and target.
 * @returns The target URL if matched, otherwise null.
 */
/**
 * Normalizes a URL for consistent comparison.
 * Removes protocol (http/https) and www.
 * @param url The URL to normalize.
 * @returns The normalized URL string.
 */
export function normalizeUrl(url: string): string {
    let normalized = url.toLowerCase();
    normalized = normalized.replace(/^https?:\/\//, '');
    normalized = normalized.replace(/^www\./, '');
    return normalized;
}

/**
 * Detects if adding a rule would create a redirect loop.
 * @param source The source URL of the new/updated rule.
 * @param target The target URL of the new/updated rule.
 * @param rules The list of existing rules to check against.
 * @returns True if a loop is detected, false otherwise.
 */
export function detectLoop(source: string, target: string, rules: Rule[]): boolean {
    const startNode = normalizeUrl(source);

    // Direct self-loop check (A -> A)
    // If the target (normalized) starts with the source, it's a direct loop
    if (normalizeUrl(target).startsWith(startNode)) {
         return true;
    }

    // BFS to find if we can reach back to startNode
    const queue: string[] = [target];
    const visitedTargets = new Set<string>();

    // Safety break to prevent infinite processing in case of complex existing loops
    let iterations = 0;
    const MAX_ITERATIONS = 1000;

    while (queue.length > 0 && iterations < MAX_ITERATIONS) {
        iterations++;
        const currentUrl = queue.shift()!;
        const currentUrlClean = normalizeUrl(currentUrl);

        if (visitedTargets.has(currentUrlClean)) continue;
        visitedTargets.add(currentUrlClean);

        for (const rule of rules) {
             // Check if this rule applies to the current URL
             const ruleSource = normalizeUrl(rule.source);
             if (currentUrlClean.startsWith(ruleSource)) {
                 const nextTarget = rule.target;

                 // Shuffle targets are considered terminal/safe for now
                 if (nextTarget === ':shuffle:') continue;

                 const nextTargetClean = normalizeUrl(nextTarget);

                 // Check if this leads back to the startNode (closing the loop)
                 if (nextTargetClean.startsWith(startNode)) {
                     return true;
                 }

                 queue.push(nextTarget);
             }
        }
    }

    return false;
}

export function matchAndGetTarget(url: string, rule: Rule): string | null {
    // Normalize URLs for comparison
    // If user enters "example.com", we match "http://example.com", "https://example.com", "https://example.com/foo"

    const source = normalizeUrl(rule.source);

    const currentUrlLower = url.toLowerCase();
    const currentUrlClean = normalizeUrl(currentUrlLower);

    if (currentUrlClean.startsWith(source)) {
        let target = rule.target;

        if (target === ':shuffle:') {
            target = getRandomProductiveUrl();
        }

        if (!target.startsWith('http')) {
            target = 'https://' + target;
        }

        // Avoid infinite redirect loops
        // If the target URL starts with the source (normalized), it will trigger the same rule again
        let targetClean = target.replace(/^https?:\/\//, '').replace(/^www\./, '');
        if (targetClean.startsWith(source)) {
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
        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})(?:\/[A-Za-z0-9_.-]*)*\/?(\?.*)?(#.*)?$/;
        if (urlPattern.test(string)) {
            return true;
        }
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

/**
 * Generates a consistent integer ID from a URL string.
 * Used for declarativeNetRequest rule IDs.
 * @param url The URL string to hash.
 * @returns A positive integer ID.
 */
export function generateRuleId(url: string): number {
    let hash = 0;
    if (url.length === 0) return hash;
    for (let i = 0; i < url.length; i++) {
        const char = url.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}
