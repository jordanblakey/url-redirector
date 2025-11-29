import { describe, it, expect } from 'vitest';
import { detectLoop } from '../../src/utils';
import { Rule } from '../../src/types';

describe('Loop Detection', () => {
  const mockRules: Rule[] = [
    { id: 1, source: 'a.com', target: 'b.com', active: true, count: 0 },
    { id: 2, source: 'b.com', target: 'c.com', active: true, count: 0 },
    { id: 3, source: 'c.com', target: 'd.com', active: true, count: 0 },
  ];

  it('should detect a direct self-loop', () => {
    expect(detectLoop('example.com', 'example.com', [])).toBe(true);
    expect(detectLoop('example.com', 'example.com/foo', [])).toBe(true);
  });

  it('should detect a simple A -> B -> A loop', () => {
    const rules: Rule[] = [{ id: 1, source: 'b.com', target: 'a.com', active: true, count: 0 }];
    expect(detectLoop('a.com', 'b.com', rules)).toBe(true);
  });

  it('should detect a multi-hop loop A -> B -> C -> A', () => {
    expect(detectLoop('d.com', 'a.com', mockRules)).toBe(true);
  });

  it('should not flag non-looping chains', () => {
    expect(detectLoop('e.com', 'a.com', mockRules)).toBe(false);
  });

  it('should ignore shuffle targets', () => {
    const rules: Rule[] = [{ id: 1, source: 'a.com', target: ':shuffle:', active: true, count: 0 }];
    expect(detectLoop('b.com', 'a.com', rules)).toBe(false);
  });
});
