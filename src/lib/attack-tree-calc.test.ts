import { describe, expect, it } from 'vitest';
import { COMPANY_X, LAB_RULES, SAFE, andProb, evaluate, firstMatch, innerNodes, orProb, type Gate } from './attack-tree-calc';

const close = (a: number, b: number, digits = 4) => expect(a).toBeCloseTo(b, digits);

describe('probability gates (independent events)', () => {
  it('OR(0.3, 0.2) = 0.44 and AND(0.3, 0.2) = 0.06', () => {
    close(orProb([0.3, 0.2]), 0.44);
    close(andProb([0.3, 0.2]), 0.06);
  });
  it('self-check: AND(0.4, 0.5) = 0.2, OR(0.4, 0.5) = 0.7', () => {
    close(andProb([0.4, 0.5]), 0.2);
    close(orProb([0.4, 0.5]), 0.7);
  });
});

describe('company Χ', () => {
  it('OR everywhere: branches 0.496 / 0.49 / 0.2305, root ≈ 0.8022', () => {
    const r = evaluate(COMPANY_X, 'probability');
    close(r.values.cred!, 0.496);
    close(r.values.vuln!, 0.49);
    close(r.values.phys!, 0.2305);
    close(r.value, 0.8022);
  });
  it('AND in the branches, OR at the root ≈ 0.01395', () => {
    const gates: Record<string, Gate> = { cred: 'AND', vuln: 'AND', phys: 'AND' };
    const r = evaluate(COMPANY_X, 'probability', { gates });
    close(r.values.cred!, 0.006, 6);
    close(r.values.vuln!, 0.0075, 6);
    close(r.values.phys!, 0.0005, 6);
    close(r.value, 0.01395);
    // the lecture's intermediate product, correctly: 0.994 × 0.9925 = 0.986545
    close(0.994 * 0.9925, 0.986545, 6);
  });
  it('OR in the branches, AND at the root ≈ 0.056', () => {
    close(evaluate(COMPANY_X, 'probability', { gates: { root: 'AND' } }).value, 0.056, 3);
  });
  it('lists steps children-first and the root last', () => {
    const { steps } = evaluate(COMPANY_X, 'probability');
    expect(steps.map((s) => s.id)).toEqual(['cred', 'vuln', 'phys', 'root']);
    expect(innerNodes(COMPANY_X).map((n) => n.id)).toEqual(['root', 'cred', 'vuln', 'phys']);
  });
  it('uses changed leaf values (after countermeasures)', () => {
    close(evaluate(COMPANY_X, 'probability', { values: { spear: 0.05 } }).values.cred!, 1 - 0.95 * 0.8 * 0.9);
  });
});

describe('the safe (costs)', () => {
  it('eavesdrop is AND: 20.000 + 40.000 = 60.000', () => {
    expect(evaluate(SAFE, 'cost').values.eavesdrop).toBe(60000);
  });
  it('cheapest attack is cutting the safe (10.000)', () => {
    expect(evaluate(SAFE, 'cost').value).toBe(10000);
  });
  it('without special equipment the cheapest is bribery (20.000)', () => {
    const r = evaluate(SAFE, 'cost', { noEquipment: true });
    expect(r.value).toBe(20000);
    expect(r.values.eavesdrop).toBe(Infinity);
  });
  it('self-check: OR over 40, 20, 70 gives 20', () => {
    const t = { id: 'r', label: 'r', gate: 'OR' as const, children: [40, 20, 70].map((v, i) => ({ id: `l${i}`, label: '', value: v })) };
    expect(evaluate(t, 'cost').value).toBe(20);
  });
});

describe('firewall first match', () => {
  it('a general ALLOW before a DENY lets telnet through', () => {
    expect(firstMatch(LAB_RULES, 23).rule?.action).toBe('ALLOW');
    expect(firstMatch(LAB_RULES, 23).index).toBe(1);
  });
  it('with the DENY first, telnet is blocked', () => {
    const fixed = [LAB_RULES[2]!, LAB_RULES[3]!, LAB_RULES[0]!, LAB_RULES[1]!];
    expect(firstMatch(fixed, 23).rule?.action).toBe('DENY');
    expect(firstMatch(fixed, 80).rule?.action).toBe('DENY');
    expect(firstMatch(fixed, 443).rule?.action).toBe('ALLOW');
  });
  it('no match when no rule covers the port', () => {
    expect(firstMatch([{ id: 'x', action: 'ALLOW', port: 443 }], 22).rule).toBeUndefined();
  });
});
