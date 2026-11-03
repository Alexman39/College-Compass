import { describe, expect, it } from 'vitest';
import { hOf, problem, run, type AlgorithmId, type ProblemId } from './heuristic-explorer';

const taken = (p: ProblemId, a: AlgorithmId) => run(p, a).map((r) => r.id);
const expanded = (p: ProblemId, a: AlgorithmId) => run(p, a).filter((r) => r.kind === 'expand').map((r) => r.id);

describe('heuristic explorer traces', () => {
  it('the maze is the lecture one: h is the Manhattan distance to 9-3', () => {
    const m = problem('maze');
    expect(m.nodes).toHaveLength(60 - m.grid!.walls.length);
    expect([hOf(m, '5-5'), hOf(m, '5-4'), hOf(m, '6-2'), hOf(m, '9-3')]).toEqual([6, 5, 4, 0]);
    expect(m.next['5-5']!.map(([id]) => id)).toEqual(['4-5', '5-6', '5-4']); // αριστερά, πάνω, κάτω
  });

  it('Greedy BestFS on the maze reaches F in 8 steps, with loops on closed states', () => {
    const rows = run('maze', 'GREEDY');
    expect(expanded('maze', 'GREEDY')).toEqual(['5-5', '5-4', '6-4', '7-4', '7-3', '6-3', '6-2', '7-5', '8-5', '9-5', '9-4']);
    expect(rows.filter((r) => r.kind === 'loop').length).toBeGreaterThan(0);
    expect(rows.at(-1)).toMatchObject({ id: '9-3', kind: 'goal', g: 8 });
    expect(rows.at(-1)!.path.join(' ')).toBe('5-5 5-4 6-4 7-4 7-5 8-5 9-5 9-4 9-3');
  });

  it('Hill Climbing on the maze gets caught between 7-3 and 6-3', () => {
    expect(taken('maze', 'HC')).toEqual(['5-5', '5-4', '6-4', '7-4', '7-3', '6-3']);
    expect(run('maze', 'HC').at(-1)).toMatchObject({ kind: 'cycle' });
  });

  it('A* on the maze finds the shortest path, 8 steps', () => {
    expect(run('maze', 'ASTAR').at(-1)).toMatchObject({ id: '9-3', kind: 'goal', g: 8 });
  });

  it('Beam keeps at most N = 2 states in the frontier', () => {
    for (const p of ['maze', 'roads', 'ex1', 'ex2'] as const) {
      expect(run(p, 'BEAM').every((r) => r.frontier.length <= 2)).toBe(true);
    }
  });

  it('Beam with N = 2 loses the way out of the maze: 7-5 is pruned, F is never reached', () => {
    const rows = run('maze', 'BEAM');
    expect(rows.some((r) => r.kind === 'goal')).toBe(false);
    expect(rows.map((r) => r.id)).not.toContain('7-5');
    expect(run('roads', 'BEAM').at(-1)).toMatchObject({ id: 'G', kind: 'goal', g: 10 });
  });

  it('exercise 1 (slide 24): HC a, c and stops; Greedy a, c, d, g, j, k', () => {
    expect(taken('ex1', 'HC')).toEqual(['a', 'c']);
    expect(run('ex1', 'HC').at(-1)).toMatchObject({ kind: 'stuck' });
    expect(taken('ex1', 'GREEDY')).toEqual(['a', 'c', 'd', 'g', 'j', 'k']);
  });

  it('exercise 2 (slide 25): HC c, i, g, f, n and stops; Greedy reaches p', () => {
    expect(taken('ex2', 'HC')).toEqual(['c', 'i1', 'g', 'f', 'n']);
    expect(run('ex2', 'HC').at(-1)).toMatchObject({ kind: 'stuck' });
    expect(taken('ex2', 'GREEDY')).toEqual(['c', 'i1', 'd', 'g', 'f', 'n', 'b', 'k', 'o', 'p']);
  });

  it('roads: Greedy pays 10 via A, A* finds the cheapest route, 8 via B', () => {
    expect(run('roads', 'GREEDY').at(-1)).toMatchObject({ id: 'G', g: 10, path: ['S', 'A', 'C', 'G'] });
    const astar = run('roads', 'ASTAR');
    expect(astar.map((r) => r.id)).toEqual(['S', 'A', 'B', 'C', 'G']);
    expect(astar.at(-1)).toMatchObject({ g: 8, path: ['S', 'B', 'C', 'G'] });
    // step 4: C reached more cheaply through B (5 instead of 7) replaces the old entry
    expect(astar[3]!.frontier).toEqual([{ id: 'C', g: 5 }, { id: 'D', g: 9 }]);
  });
});
