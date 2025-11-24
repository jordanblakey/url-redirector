import { Rule } from './types';

export function toggleRuleState(rule: Rule): void {
    const now = Date.now();
    if (rule.pausedUntil && rule.pausedUntil > now) {
        // Already paused, so resume
        rule.pausedUntil = undefined;
        rule.active = true;
    } else if (!rule.active) {
        // It was permanently disabled, enable it
        rule.active = true;
        rule.pausedUntil = undefined;
    } else {
        // Active and not paused, so pause it for 5 minutes (currently 5 seconds for testing?)
        rule.pausedUntil = now + 5 * 60 * 1000;
    }
}
