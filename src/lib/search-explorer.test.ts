import { describe, expect, it } from 'vitest';
import { g, run } from './search-explorer';
import { node } from './water-jug';

const labels = (alg: Parameters<typeof run>[0]) => run(alg).map((r) => r.id);

describe('search explorer traces', () => {
  it('DFS and BFS are the lecture traces on the glasses tree', () => {
    expect(run('DFS').map((r) => node(r.id).label).join('')).toBe('ΑΒΑΔΒΖΑΘΖΔΙΚ');
    expect(run('BFS').at(-1)).toMatchObject({ id: 'k', kind: 'goal' });
  });

  it('ID deepens 1, 2, 3, … and finds Κ at limit 6, where Κ lies', () => {
    const rows = run('ID');
    const limits = [...new Set(rows.map((r) => r.limit))];
    expect(limits).toEqual([1, 2, 3, 4, 5, 6]);
    expect(rows.at(-1)).toMatchObject({ id: 'k', kind: 'goal', limit: 6 });
    // a state at the limit is examined but not expanded
    expect(rows.find((r) => r.limit === 1 && r.kind === 'cut')).toBeDefined();
    expect(rows.filter((r) => r.kind === 'cut').every((r) => r.children.length === 0)).toBe(true);
  });

  it('B&B (lecture slide 55) finds T at cost 8 and then prunes J', () => {
    expect([g('T'), g('J'), g('I'), g('G')]).toEqual([8, 8, 7, 9]);
    const rows = run('BB');
    expect(rows.map((r) => r.id).join(' ')).toBe('S A C D G H T B E I F J');
    expect(rows.find((r) => r.id === 'T')).toMatchObject({ kind: 'goal', cost: 8 });
    expect(rows.find((r) => r.id === 'J')).toMatchObject({ kind: 'pruned', cost: 8, bound: 8 });
    expect(rows.find((r) => r.id === 'G')).toMatchObject({ kind: 'leaf', bound: Infinity });
  });

  it('Beam with width 2 keeps the two lowest-h states and reaches T', () => {
    const rows = run('BEAM');
    expect(labels('BEAM').join(' ')).toBe('S B E I A D G H T');
    expect(rows.every((r) => r.frontier.length <= 2)).toBe(true);
  });

  it('BiS alternates sides and the two searches meet at D', () => {
    const rows = run('BiS');
    expect(rows.map((r) => `${r.side === 'forward' ? '→' : '←'}${r.id}`).join(' ')).toBe('→S ←T →A ←H');
    expect(rows.at(-1)).toMatchObject({ kind: 'meet', childIds: ['D'] });
  });
});
