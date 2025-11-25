import { test, expect } from "@playwright/test";
import { toggleRuleState } from "../../src/ui.js";
import { Rule } from "../../src/types";

test.describe("UI Logic - toggleRuleState", () => {
  test("should pause an active rule", () => {
    const rule: Rule = {
      id: 1,
      source: "src",
      target: "tgt",
      active: true,
      count: 0,
      pausedUntil: undefined,
    };

    const now = Date.now();
    toggleRuleState(rule);

    expect(rule.active).toBe(true); // Still active in definition, but has pausedUntil
    expect(rule.pausedUntil).toBeGreaterThan(now);
    // Default pause is 5 minutes
    expect(rule.pausedUntil).toBeLessThanOrEqual(now + 5 * 60 * 1000 + 1000);
  });

  test("should resume a paused rule", () => {
    const futureTime = Date.now() + 100000;
    const rule: Rule = {
      id: 1,
      source: "src",
      target: "tgt",
      active: true,
      count: 0,
      pausedUntil: futureTime,
    };

    toggleRuleState(rule);

    expect(rule.active).toBe(true);
    expect(rule.pausedUntil).toBeUndefined();
  });

  test("should activate an inactive rule", () => {
    const rule: Rule = {
      id: 1,
      source: "src",
      target: "tgt",
      active: false,
      count: 0,
      pausedUntil: undefined,
    };

    toggleRuleState(rule);

    expect(rule.active).toBe(true);
    expect(rule.pausedUntil).toBeUndefined();
  });
});
