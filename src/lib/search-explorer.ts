/**
 * Step-by-step traces of the search algorithms of CN6005 Lecture 2 (and
 * Beam Search from Week 3), for the interactive explorer
 * (src/scripts/demos/search-explorer.ts). Pure data; tested in
 * search-explorer.test.ts.
 *
 *  - DFS, BFS, ID run on the two-glasses tree of the lecture (slide 19,
 *    src/lib/water-jug.ts).
 *  - BiS, B&B, Beam run on a small teaching tree S…T with step costs c and
 *    heuristic values h. That tree is ours, not the lecture's.
 *
 * Each algorithm follows the lecture's definition:
 *  - ID: bounded DFS with limit 1, 2, 3, … (slide 36, T = 1, k = 1). A state at
 *    the limit is examined but neither expanded nor closed.
 *  - B&B: depth-first; a state is expanded only if its cost is below the best
 *    solution so far, and every solution found lowers that bound (slide 55).
 *  - BiS: one breadth-first step from the start, one from the goal, in turn,
 *    until a state is reached from both sides.
 *  - Beam: like greedy best-first, but after sorting by h only the best
 *    N = 2 states of the frontier are kept (Week 3).
 */
import { NODES as JUG_NODES, childrenOf as jugChildren, node as jugNode, trace as jugTrace } from './water-jug';

export type AlgorithmId = 'DFS' | 'BFS' | 'ID' | 'BiS' | 'BB' | 'BEAM';
export type TreeId = 'jug' | 'st';
export type RowKind = 'expand' | 'loop' | 'goal' | 'cut' | 'pruned' | 'leaf' | 'meet';

export interface Row {
  /** Node taken from the frontier (an id of the tree drawn). */
  id: string;
  /** Labels as the lecture's tables show them. */
  frontier: string[];
  closed: string[];
  children: string[];
  /** Ids of the children, to highlight them in the tree. */
  childIds: string[];
  kind: RowKind;
  /** ID: depth limit of this round. */
  limit?: number;
  /** BiS: which search took this step. */
  side?: 'forward' | 'backward';
  /** B&B: cost so far and the bound at this step. */
  cost?: number;
  bound?: number;
}

export const ALGORITHMS: { id: AlgorithmId; label: string; tree: TreeId }[] = [
  { id: 'DFS', label: 'DFS', tree: 'jug' },
  { id: 'BFS', label: 'BFS', tree: 'jug' },
  { id: 'ID', label: 'ID', tree: 'jug' },
  { id: 'BiS', label: 'BiS', tree: 'st' },
  { id: 'BB', label: 'B&B', tree: 'st' },
  { id: 'BEAM', label: 'Beam', tree: 'st' },
];

// ---- The teaching tree S…T --------------------------------------------------

export interface StNode {
  id: string;
  x: number;
  y: number;
  parent: string | null;
  /** Cost of the step from the parent. */
  cost: number;
  /** Heuristic estimate of the distance to T. */
  h: number;
}

const st = (id: string, x: number, y: number, parent: string | null, cost: number, h: number): StNode => ({ id, x, y, parent, cost, h });

export const ST_NODES: StNode[] = [
  st('S', 400, 50, null, 0, 6),
  st('A', 220, 160, 'S', 2, 5),
  st('B', 580, 160, 'S', 3, 3),
  st('C', 105, 280, 'A', 3, 6),
  st('D', 310, 280, 'A', 2, 3),
  st('E', 490, 280, 'B', 2, 2),
  st('F', 690, 280, 'B', 4, 5),
  st('G', 230, 405, 'D', 5, 0),
  st('H', 390, 405, 'D', 1, 2),
  st('I', 490, 405, 'E', 2, 1),
  st('J', 690, 405, 'F', 1, 2),
  st('T', 470, 530, 'H', 3, 0),
];
export const ST_GOAL = 'T';
const stBy = new Map(ST_NODES.map((n) => [n.id, n]));
export const stNode = (id: string): StNode => stBy.get(id)!;
const stKids = (id: string) => ST_NODES.filter((n) => n.parent === id).map((n) => n.id);
/** Path cost g from S. */
export const g = (id: string): number => {
  let sum = 0;
  for (let n = stNode(id); n.parent; n = stNode(n.parent)) sum += n.cost;
  return sum;
};
const neighbours = (id: string) => [...(stNode(id).parent ? [stNode(id).parent!] : []), ...stKids(id)];

// ---- Algorithms -------------------------------------------------------------

const jugLabels = (ids: string[]) => ids.map((id) => jugNode(id).label);

function dfsBfs(alg: 'DFS' | 'BFS'): Row[] {
  return jugTrace(alg).map((r) => ({
    id: r.id,
    frontier: jugLabels(r.frontier),
    closed: [...r.closed],
    children: jugLabels(r.children),
    childIds: r.children,
    kind: r.goal ? 'goal' : r.loop ? 'loop' : 'expand',
  }));
}

function iterativeDeepening(): Row[] {
  const rows: Row[] = [];
  const depth = (id: string) => {
    let d = 0;
    for (let n = jugNode(id); n.parent; n = jugNode(n.parent)) d++;
    return d;
  };
  for (let limit = 1; limit <= 10; limit++) {
    let frontier = ['a'];
    const closed: string[] = [];
    while (frontier.length) {
      const id = frontier[0]!;
      const { label } = jugNode(id);
      const base = { id, frontier: jugLabels(frontier), closed: [...closed], limit };
      frontier = frontier.slice(1);
      if (closed.includes(label)) {
        rows.push({ ...base, children: [], childIds: [], kind: 'loop' });
        continue;
      }
      if (id === 'k') {
        rows.push({ ...base, children: [], childIds: [], kind: 'goal' });
        return rows;
      }
      if (depth(id) >= limit) {
        rows.push({ ...base, children: [], childIds: [], kind: 'cut' });
        continue;
      }
      const kids = jugChildren(id);
      rows.push({ ...base, children: jugLabels(kids), childIds: kids, kind: kids.length ? 'expand' : 'leaf' });
      frontier = [...kids, ...frontier];
      closed.push(label);
    }
  }
  return rows;
}

function branchAndBound(): Row[] {
  const rows: Row[] = [];
  let frontier = ['S'];
  const closed: string[] = [];
  let best = Infinity;
  while (frontier.length) {
    const id = frontier[0]!;
    const cost = g(id);
    const base = { id, frontier: [...frontier], closed: [...closed], cost, bound: best };
    frontier = frontier.slice(1);
    if (!(cost < best)) {
      rows.push({ ...base, children: [], childIds: [], kind: 'pruned' });
      continue;
    }
    if (id === ST_GOAL) {
      best = cost;
      rows.push({ ...base, children: [], childIds: [], kind: 'goal' });
      continue; // B&B keeps going: a cheaper solution may still exist
    }
    const kids = stKids(id).filter((k) => !frontier.includes(k) && !closed.includes(k));
    rows.push({ ...base, children: kids, childIds: kids, kind: kids.length ? 'expand' : 'leaf' });
    frontier = [...kids, ...frontier];
    closed.push(id);
  }
  return rows;
}

function beam(width = 2): Row[] {
  const rows: Row[] = [];
  let frontier = ['S'];
  const closed: string[] = [];
  while (frontier.length) {
    const id = frontier[0]!;
    const base = { id, frontier: [...frontier], closed: [...closed] };
    frontier = frontier.slice(1);
    if (id === ST_GOAL) {
      rows.push({ ...base, children: [], childIds: [], kind: 'goal' });
      break;
    }
    const kids = stKids(id).filter((k) => !closed.includes(k));
    rows.push({ ...base, children: kids, childIds: kids, kind: kids.length ? 'expand' : 'leaf' });
    closed.push(id);
    frontier = [...frontier, ...kids]
      .sort((x, y) => stNode(x).h - stNode(y).h || x.localeCompare(y))
      .slice(0, width);
  }
  return rows;
}

function bidirectional(): Row[] {
  const rows: Row[] = [];
  const side = {
    forward: { front: ['S'], seen: new Set(['S']), closed: [] as string[] },
    backward: { front: [ST_GOAL], seen: new Set([ST_GOAL]), closed: [] as string[] },
  };
  for (let turn = 0; turn < 40; turn++) {
    const name = turn % 2 === 0 ? 'forward' : 'backward';
    const me = side[name];
    const other = side[name === 'forward' ? 'backward' : 'forward'];
    if (!me.front.length) break;
    const id = me.front[0]!;
    const base = { id, frontier: [...me.front], closed: [...me.closed], side: name as 'forward' | 'backward' };
    me.front = me.front.slice(1);
    const kids = neighbours(id).filter((k) => !me.seen.has(k));
    for (const k of kids) me.seen.add(k);
    me.front.push(...kids);
    me.closed.push(id);
    const met = kids.find((k) => other.seen.has(k));
    rows.push({ ...base, children: kids, childIds: met ? [met] : kids, kind: met ? 'meet' : 'expand' });
    if (met) break;
  }
  return rows;
}

export function run(alg: AlgorithmId): Row[] {
  switch (alg) {
    case 'DFS':
    case 'BFS':
      return dfsBfs(alg);
    case 'ID':
      return iterativeDeepening();
    case 'BB':
      return branchAndBound();
    case 'BEAM':
      return beam();
    case 'BiS':
      return bidirectional();
  }
}

export { JUG_NODES };
