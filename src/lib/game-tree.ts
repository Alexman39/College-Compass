/**
 * Step-by-step traces of Minimax and Alpha-Beta on small game trees, for the
 * game-tree explorer of CN6005 Week 4 (src/scripts/demos/game-tree.ts).
 * Pure data; tested in game-tree.test.ts.
 *
 * Trees:
 *  - abc: the example of the lesson (and of the Week 4 rewrite): MAX chooses
 *    between A (6, 8, 4), B (3, 11, 7) and C (9, 5, 10). Minimax 5, move C;
 *    Alpha-Beta evaluates 7 of the 9 leaves.
 *  - order: the same tree with C first and A's leaves as 4, 6, 8: 5 leaves.
 *  - lecture: the tree of the lecture's slides 13–14 and 24–26, B (3, 12, 8),
 *    C (2, 4, 6), D (14, 5, 2). Minimax 3, move a1 to B; Alpha-Beta prunes
 *    C's 4 and 6, as in steps (a)–(f) of slides 24–25.
 *  - lecture2: the second Alpha-Beta example of slide 20, four MIN nodes
 *    (4, 10, 7), (5, −1, 2), (15, −7, 3), (−5, −8, 1). The slide does not name
 *    the nodes; B–E are ours.
 *
 * The search is depth-first, children left to right. MAX keeps the first
 * child with the largest value, MIN the first with the smallest. Alpha-Beta
 * prunes the remaining children of a node as soon as α ≥ β.
 */

export type TreeId = 'abc' | 'order' | 'lecture' | 'lecture2';
export type Alg = 'MINIMAX' | 'AB';
export type RowKind = 'enter' | 'child' | 'prune' | 'return';

export interface GameNode {
  id: string;
  label: string;
  /** Internal nodes: whose turn it is. Leaves: undefined. */
  max?: boolean;
  children: string[];
  /** Leaves only: the value of the evaluation function. */
  value?: number;
}

export interface GameTree {
  id: TreeId;
  label: string;
  root: string;
  nodes: Record<string, GameNode>;
}

export interface Row {
  kind: RowKind;
  /** The node this step works on. */
  node: string;
  /** kind 'child': the child whose value just came back. */
  child?: string;
  /** kind 'child': the child's value. */
  childValue?: number;
  /** Best value of `node` so far (child, prune) or its final value (return). */
  value?: number;
  /** Alpha-Beta only; null in Minimax. */
  alpha: number | null;
  beta: number | null;
  /** kind 'prune': the children that are skipped. */
  pruned?: string[];
  /** Leaves evaluated so far, this step included. */
  leaves: number;
}

// ---- Trees --------------------------------------------------------------------

/** A MAX root over MIN nodes with leaf values; leaf ids are `${min}${k}`. */
function twoPly(id: TreeId, label: string, root: string, mins: [string, number[]][]): GameTree {
  const nodes: Record<string, GameNode> = { [root]: { id: root, label: root, max: true, children: mins.map(([m]) => m) } };
  for (const [m, vals] of mins) {
    nodes[m] = { id: m, label: m, max: false, children: vals.map((_, k) => `${m}${k + 1}`) };
    vals.forEach((v, k) => (nodes[`${m}${k + 1}`] = { id: `${m}${k + 1}`, label: String(v), children: [], value: v }));
  }
  return { id, label, root, nodes };
}

export const TREES: GameTree[] = [
  twoPly('abc', 'A / B / C', 'R', [['A', [6, 8, 4]], ['B', [3, 11, 7]], ['C', [9, 5, 10]]]),
  twoPly('order', 'Άλλη σειρά', 'R', [['C', [9, 5, 10]], ['A', [4, 6, 8]], ['B', [3, 11, 7]]]),
  twoPly('lecture', 'Διάλεξη: B / C / D', 'A', [['B', [3, 12, 8]], ['C', [2, 4, 6]], ['D', [14, 5, 2]]]),
  twoPly('lecture2', 'Διάλεξη: 4 κόμβοι MIN', 'A', [['B', [4, 10, 7]], ['C', [5, -1, 2]], ['D', [15, -7, 3]], ['E', [-5, -8, 1]]]),
];

export const tree = (id: TreeId): GameTree => TREES.find((t) => t.id === id)!;
export const isLeaf = (n: GameNode) => n.value !== undefined;

export function leafCount(t: GameTree): number {
  return Object.values(t.nodes).filter(isLeaf).length;
}

// ---- Search -------------------------------------------------------------------

export function run(id: TreeId, alg: Alg): Row[] {
  const t = tree(id);
  const rows: Row[] = [];
  const ab = alg === 'AB';
  let leaves = 0;

  function search(nid: string, alpha: number, beta: number): number {
    const n = t.nodes[nid]!;
    if (isLeaf(n)) {
      leaves++;
      return n.value!;
    }
    const a = () => (ab ? alpha : null);
    const b = () => (ab ? beta : null);
    rows.push({ kind: 'enter', node: nid, alpha: a(), beta: b(), leaves });
    let best = n.max ? -Infinity : Infinity;
    for (let i = 0; i < n.children.length; i++) {
      const c = n.children[i]!;
      const v = search(c, alpha, beta);
      if (n.max ? v > best : v < best) best = v;
      if (n.max) alpha = Math.max(alpha, best);
      else beta = Math.min(beta, best);
      rows.push({ kind: 'child', node: nid, child: c, childValue: v, value: best, alpha: a(), beta: b(), leaves });
      const rest = n.children.slice(i + 1);
      if (ab && alpha >= beta && rest.length) {
        rows.push({ kind: 'prune', node: nid, value: best, alpha: a(), beta: b(), pruned: rest, leaves });
        break;
      }
    }
    rows.push({ kind: 'return', node: nid, value: best, alpha: a(), beta: b(), leaves });
    return best;
  }

  search(t.root, -Infinity, Infinity);
  return rows;
}

/** The child of the root that MAX plays (the first with the root's value). */
export function bestMove(id: TreeId, alg: Alg): string {
  const rows = run(id, alg);
  const t = tree(id);
  const value = rows.at(-1)!.value;
  return rows.find((r) => r.kind === 'child' && r.node === t.root && r.childValue === value)!.child!;
}

/** All leaves under the children that were pruned, at every step up to `upto`. */
export function prunedLeaves(id: TreeId, rows: Row[], upto = rows.length): Set<string> {
  const t = tree(id);
  const out = new Set<string>();
  const add = (nid: string) => {
    const n = t.nodes[nid]!;
    if (isLeaf(n)) out.add(nid);
    n.children.forEach(add);
  };
  rows.slice(0, upto).forEach((r) => r.pruned?.forEach(add));
  return out;
}

// ---- «Πρόβλεψη» -----------------------------------------------------------------

export interface Question {
  text: string;
  options: string[];
  answer: string;
}

/**
 * The question asked before row `i` is shown, if any:
 *  - before a node returns: «Ποια τιμή επιστρέφει ο X;», among the values of
 *    its children seen so far (only when there are at least two);
 *  - Alpha-Beta, after a child's value came back and the node still has
 *    children left: «Γίνεται κλάδεμα;» Ναι / Όχι.
 */
export function question(id: TreeId, rows: Row[], i: number, alg: Alg): Question | undefined {
  const t = tree(id);
  const row = rows[i];
  const prev = rows[i - 1];
  if (!row) return undefined;
  const name = (nid: string) => (nid === t.root ? `η ρίζα ${t.nodes[nid]!.label}` : `ο ${t.nodes[nid]!.label}`);
  if (row.kind === 'return') {
    const seen = rows.slice(0, i).filter((r) => r.kind === 'child' && r.node === row.node).map((r) => String(r.childValue));
    const options = [...new Set(seen)].sort((x, y) => Number(x) - Number(y));
    if (options.length < 2) return undefined;
    const who = t.nodes[row.node]!.max ? 'MAX' : 'MIN';
    return { text: `Ποια τιμή επιστρέφει ${name(row.node)} (${who});`, options, answer: String(row.value) };
  }
  if (alg === 'AB' && prev?.kind === 'child') {
    const n = t.nodes[prev.node]!;
    const left = n.children.slice(n.children.indexOf(prev.child!) + 1);
    if (left.length) {
      const labels = left.map((c) => t.nodes[c]!.label).join(', ');
      return { text: `Κλαδεύονται τα υπόλοιπα παιδιά ${n.id === t.root ? 'της ρίζας' : `του ${n.label}`} (${labels});`, options: ['Ναι', 'Όχι'], answer: row.kind === 'prune' ? 'Ναι' : 'Όχι' };
    }
  }
  return undefined;
}
