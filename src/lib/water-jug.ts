/**
 * The two-glasses problem of CN6005 Lecture 2 (70 ml and 50 ml, goal 40 ml):
 * the part of the search tree drawn on slide 19, and a step-by-step trace of
 * DFS or BFS over it with the lecture's algorithm (take the first state of
 * the frontier; skip it if it is already in the closed set; stop at the
 * goal; otherwise add its children to the front (DFS) or the back (BFS) of
 * the frontier and close it). Pure data, used by src/scripts/demos/water-jug.ts.
 */

export interface JugNode {
  id: string;
  /** State name as on the slide (the same state can appear several times). */
  label: string;
  /** ml in the 70 ml and the 50 ml glass. */
  big: number;
  small: number;
  /** Position in the 800 × 585 drawing. */
  x: number;
  y: number;
  parent: string | null;
}

export type Algorithm = 'DFS' | 'BFS';

export interface TraceRow {
  /** The node taken from the frontier. */
  id: string;
  /** Frontier and closed set as they were before taking it. */
  frontier: string[];
  closed: string[];
  /** Already examined: a loop (βρόχος), not expanded. */
  loop: boolean;
  goal: boolean;
  /** Children added to the frontier (empty for a loop or the goal). */
  children: string[];
}

const N = (id: string, label: string, big: number, small: number, x: number, y: number, parent: string | null): JugNode => ({
  id, label, big, small, x, y, parent,
});

export const NODES: JugNode[] = [
  N('a', 'Α', 0, 0, 400, 40, null),
  N('b', 'Β', 70, 0, 185, 120, 'a'),
  N('g', 'Γ', 0, 50, 615, 120, 'a'),
  N('ba', 'Α', 0, 0, 65, 205, 'b'),
  N('d', 'Δ', 20, 50, 250, 205, 'b'),
  N('e', 'Ε', 50, 0, 550, 205, 'g'),
  N('ga', 'Α', 0, 0, 730, 205, 'g'),
  N('db', 'Β', 70, 0, 130, 290, 'd'),
  N('z', 'Ζ', 20, 0, 270, 290, 'd'),
  N('dg', 'Γ', 0, 50, 405, 290, 'd'),
  N('ea', 'Α', 0, 0, 490, 290, 'e'),
  N('h', 'Η', 50, 50, 655, 290, 'e'),
  N('za', 'Α', 0, 0, 135, 375, 'z'),
  N('t', 'Θ', 0, 20, 270, 375, 'z'),
  N('zd', 'Δ', 20, 50, 405, 375, 'z'),
  N('he', 'Ε', 50, 0, 575, 375, 'h'),
  N('hg', 'Γ', 0, 50, 735, 375, 'h'),
  N('tz', 'Ζ', 20, 0, 145, 460, 't'),
  N('td', 'Δ', 20, 50, 270, 460, 't'),
  N('i', 'Ι', 70, 20, 405, 460, 't'),
  N('k', 'Κ', 40, 50, 325, 545, 'i'),
  N('ig', 'Γ', 0, 50, 475, 545, 'i'),
  N('ib', 'Β', 70, 0, 625, 545, 'i'),
];

export const GOAL = 'k';
const byId = new Map(NODES.map((n) => [n.id, n]));
export const node = (id: string): JugNode => byId.get(id)!;
export const childrenOf = (id: string): string[] => NODES.filter((n) => n.parent === id).map((n) => n.id);

export function trace(alg: Algorithm): TraceRow[] {
  const rows: TraceRow[] = [];
  let frontier = ['a'];
  const closed: string[] = [];
  while (frontier.length) {
    const id = frontier[0]!;
    const { label } = node(id);
    const loop = closed.includes(label);
    const goal = id === GOAL;
    const children = loop || goal ? [] : childrenOf(id);
    rows.push({ id, frontier: [...frontier], closed: [...closed], loop, goal, children });
    if (goal) break;
    frontier = frontier.slice(1);
    if (!loop) {
      frontier = alg === 'DFS' ? [...children, ...frontier] : [...frontier, ...children];
      closed.push(label);
    }
  }
  return rows;
}

/** "<Β, Γ>" / "{Α, Β}" — the notation of the lecture's tables. */
export const formatFrontier = (ids: string[]) => (ids.length ? `<${ids.map((id) => node(id).label).join(', ')}>` : '∅');
export const formatClosed = (labels: string[]) => `{${labels.join(', ')}}`;
