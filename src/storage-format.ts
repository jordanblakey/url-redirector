import { Rule, CompressedRule } from './types';

export const compressRules = (rules: Rule[]): CompressedRule[] => {
  return rules.map((rule) => {
    const compressedRule: CompressedRule = [
      rule.id,
      rule.source,
      rule.target,
      rule.count,
      rule.active ? 1 : 0,
    ];
    if (rule.pausedUntil) {
      compressedRule.push(rule.pausedUntil);
    }
    return compressedRule;
  });
};

export const decompressRules = (compressedRules: CompressedRule[]): Rule[] => {
  return compressedRules.map((compressedRule) => {
    const [id, source, target, count, active, pausedUntil] = compressedRule;
    const rule: Rule = {
      id,
      source,
      target,
      count,
      active: active === 1,
    };
    if (pausedUntil) {
      rule.pausedUntil = pausedUntil;
    }
    return rule;
  });
};
