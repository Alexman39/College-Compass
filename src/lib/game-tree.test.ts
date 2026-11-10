import { describe, expect, it } from 'vitest';
import { bestMove, leafCount, prunedLeaves, question, run, tree, TREES, type Alg, type TreeId } from './game-tree';

const final = (id: TreeId, alg: Alg) => run(id, alg).at(-1)!;
const leafValues = (id: TreeId, ids: Set<string>) => [...ids].map((l) => tree(id).nodes[l]!.value);

describe('game-tree traces', () => {
  it('A/B/C: Minimax = 5 with 9 leaves, Alpha-Beta = 5 with 7 leaves, move C', () => {
    expect(leafCount(tree('abc'))).toBe(9);
    expect(final('abc', 'MINIMAX')).toMatchObject({ kind: 'return', node: 'R', value: 5, leaves: 9 });
    expect(final('abc', 'AB')).toMatchObject({ value: 5, leaves: 7 });
    expect(bestMove('abc', 'MINIMAX')).toBe('C');
    expect(bestMove('abc', 'AB')).toBe('C');
    const rows = run('abc', 'AB');
    expect(leafValues('abc', prunedLeaves('abc', rows))).toEqual([11, 7]);
    // the prune happens at B with α = 4 ≥ β = 3
    expect(rows.find((r) => r.kind === 'prune')).toMatchObject({ node: 'B', alpha: 4, beta: 3 });
  });

  it('C first and 4 first in A: 5 leaves, same value', () => {
    expect(final('order', 'AB')).toMatchObject({ value: 5, leaves: 5 });
    expect(final('order', 'MINIMAX')).toMatchObject({ value: 5, leaves: 9 });
    expect(bestMove('order', 'AB')).toBe('C');
    expect(leafValues('order', prunedLeaves('order', run('order', 'AB'))).sort()).toEqual([11, 6, 7, 8].sort());
  });

  it("the lecture's tree: value 3, move to B, C's 4 and 6 pruned (steps a–f)", () => {
    expect(final('lecture', 'MINIMAX').value).toBe(3);
    expect(final('lecture', 'AB')).toMatchObject({ value: 3, leaves: 7 });
    expect(bestMove('lecture', 'AB')).toBe('B');
    expect(leafValues('lecture', prunedLeaves('lecture', run('lecture', 'AB')))).toEqual([4, 6]);
    // the intervals of slides 24–25: after B the root has [3, +∞]; D ends at [3, 2]
    const rows = run('lecture', 'AB');
    expect(rows.find((r) => r.kind === 'enter' && r.node === 'C')).toMatchObject({ alpha: 3, beta: Infinity });
    expect(rows.find((r) => r.kind === 'return' && r.node === 'D')).toMatchObject({ value: 2, alpha: 3, beta: 2 });
  });

  it("the lecture's second example: value 4, 2, 3, −8 and 1 pruned", () => {
    expect(final('lecture2', 'MINIMAX').value).toBe(4);
    expect(final('lecture2', 'AB')).toMatchObject({ value: 4, leaves: 8 });
    expect(leafValues('lecture2', prunedLeaves('lecture2', run('lecture2', 'AB')))).toEqual([2, 3, -8, 1]);
  });

  it('Minimax never prunes and carries no α/β', () => {
    for (const t of TREES) {
      const rows = run(t.id, 'MINIMAX');
      expect(rows.some((r) => r.kind === 'prune')).toBe(false);
      expect(rows.every((r) => r.alpha === null && r.beta === null)).toBe(true);
      expect(final(t.id, 'MINIMAX').value).toBe(final(t.id, 'AB').value);
    }
  });
});

describe('question («Πρόβλεψη»)', () => {
  it('every question offers its answer', () => {
    for (const t of TREES) {
      for (const alg of ['MINIMAX', 'AB'] as Alg[]) {
        const rows = run(t.id, alg);
        rows.forEach((_, i) => {
          const q = question(t.id, rows, i, alg);
          if (q) expect(q.options).toContain(q.answer);
        });
      }
    }
  });

  it('A/B/C with Alpha-Beta: B is pruned after its first leaf, A is not', () => {
    const rows = run('abc', 'AB');
    const asks = rows.map((_, i) => question('abc', rows, i, 'AB')).filter((q) => q?.options[0] === 'Ναι');
    expect(asks.map((q) => q!.answer)).toEqual(['Όχι', 'Όχι', 'Όχι', 'Ναι', 'Όχι', 'Όχι', 'Όχι']); // A: 6, 8 · root: A · B: 3 · root: B · C: 9, 5
    const ret = rows.findIndex((r) => r.kind === 'return' && r.node === 'A');
    expect(question('abc', rows, ret, 'AB')).toMatchObject({ options: ['4', '6', '8'], answer: '4' });
  });
});
