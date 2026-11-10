import { describe, expect, it } from 'vitest';
import { ATTACK_CASES, CIA_CASES, GOALS, MCCUMBER, MEANS, STATES, mccumber, riskBand, riskScore, sameSet } from './security-basics';

describe('risk score', () => {
  it('multiplies likelihood by impact (lesson example 4 × 5 = 20)', () => {
    expect(riskScore(4, 5)).toBe(20);
    expect(riskBand(20)).toBe('Κρίσιμος');
  });
  it('rejects values outside 1–5', () => {
    expect(() => riskScore(0, 3)).toThrow(RangeError);
    expect(() => riskScore(3, 6)).toThrow(RangeError);
    expect(() => riskScore(2.5, 3)).toThrow(RangeError);
  });
  it('bands every possible score', () => {
    expect([1, 4, 5, 9, 10, 16, 20, 25].map(riskBand)).toEqual(['Χαμηλός', 'Χαμηλός', 'Μέτριος', 'Μέτριος', 'Υψηλός', 'Υψηλός', 'Κρίσιμος', 'Κρίσιμος']);
  });
});

describe('McCumber cube', () => {
  it('has one example for each of the 27 cells', () => {
    expect(Object.keys(MCCUMBER)).toHaveLength(27);
    for (const [g] of GOALS) for (const [s] of STATES) for (const [m] of MEANS) expect(mccumber(g, s, m)).toBeTruthy();
  });
  it('maps the lesson example: confidentiality, transmission, technology → TLS', () => {
    expect(mccumber('C', 'transmission', 'technology')).toContain('TLS');
  });
});

describe('classifier data', () => {
  it('has eight CIA cases, each with at least one goal', () => {
    expect(CIA_CASES).toHaveLength(8);
    for (const c of CIA_CASES) expect(c.answer.length).toBeGreaterThan(0);
  });
  it('covers all four attack forms', () => {
    expect(new Set(ATTACK_CASES.map((c) => c.form)).size).toBe(4);
  });
  it('compares sets regardless of order', () => {
    expect(sameSet(['I', 'A'], ['A', 'I'])).toBe(true);
    expect(sameSet(['I'], ['I', 'A'])).toBe(false);
  });
});
