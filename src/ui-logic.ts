import { Rule } from './types';
import { getRandomMessage } from './messages.js';

/**
 * Pure function to get favicon URL for a domain
 */
export function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch (_e) {
    return 'default-icon.png';
  }
}

/**
 * Pure function to check if a target should show a favicon
 */
export function shouldShowFavicon(target: string): boolean {
  return target !== ':shuffle:';
}

/**
 * Pure function to format pause button text
 */
export function formatPauseButtonText(rule: Rule): string {
  const now = Date.now();
  const isPaused = rule.pausedUntil && rule.pausedUntil > now;

  if (isPaused) {
    const remaining = Math.ceil(((rule.pausedUntil || 0) - now) / 1000);
    if (remaining > 60) {
      return `Paused (${Math.ceil(remaining / 60)}m)`;
    } else {
      return `Paused (${remaining}s)`;
    }
  } else {
    return rule.active ? 'Pause' : 'Play';
  }
}

/**
 * Pure function to format remaining pause time
 */
export function formatRemainingTime(pausedUntil: number): string {
  const now = Date.now();
  const remaining = Math.ceil((pausedUntil - now) / 1000);

  if (remaining > 60) {
    return `Paused (${Math.ceil(remaining / 60)}m)`;
  } else {
    return `Paused (${remaining}s)`;
  }
}

/**
 * Pure function to check if a rule is currently paused
 */
export function isRulePaused(rule: Rule): boolean {
  return !!(rule.pausedUntil && rule.pausedUntil > Date.now());
}

/**
 * Pure function to determine if a rule should be displayed as paused
 */
export function shouldDisplayAsPaused(rule: Rule): boolean {
  return !rule.active || isRulePaused(rule);
}

/**
 * Pure function to get the display text for a target
 */
export function getTargetDisplayText(target: string): string {
  return target === ':shuffle:' ? '🔀 shuffle' : target;
}

/**
 * Pure function to get the count message for a rule
 */
export function getCountMessage(rule: Rule): string {
  return getRandomMessage(rule.count || 0);
}

/**
 * Pure function to sort rules alphabetically by source
 */
export function sortRulesBySource(rules: Rule[]): Rule[] {
  return [...rules].sort((a, b) => a.source.localeCompare(b.source));
}

/**
 * Pure function to extract placeholder value from input
 */
export function extractPlaceholderValue(placeholder: string): string {
  if (placeholder.toLowerCase().startsWith('e.g. ')) {
    return placeholder.substring(5);
  }
  return placeholder;
}

/**
 * Pure function to determine the next state when toggling a rule
 */
export function getNextRuleState(rule: Rule): Partial<Rule> {
  const now = Date.now();

  if (rule.pausedUntil && rule.pausedUntil > now) {
    // Already paused, so resume
    return {
      pausedUntil: undefined,
      active: true,
    };
  } else if (!rule.active) {
    // It was permanently disabled, enable it
    return {
      active: true,
      pausedUntil: undefined,
    };
  } else {
    // Active and not paused, so pause it for 5 minutes
    return {
      pausedUntil: now + 5 * 60 * 1000,
    };
  }
}
