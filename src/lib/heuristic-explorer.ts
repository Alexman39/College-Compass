/**
 * Step-by-step traces of the heuristic search algorithms of CN6005 Lecture 3,
 * for the interactive explorer (src/scripts/demos/heuristic-explorer.ts).
 * Pure data; tested in heuristic-explorer.test.ts.
 *
 * Problems:
 *  - maze: the lecture's maze (slide 14), S = 5-5, F = 9-3, h = Manhattan
 *    distance to F, every move costs 1. Moves in the order αριστερά, πάνω,
 *    δεξιά, κάτω, as in Week 2.
 *  - book: the grid of the book's Σχήμα 4.5, S = 3-4, G = 7-8. The figure
 *    writes the Manhattan distance in every free cell, so unnumbered cells
 *    are obstacles. Its Table 4.1 is the BestFS run reproduced here.
 *  - roads: the small road network of the lesson (ours, not the lecture's).
 *  - ex1, ex2: the exercise trees of slides 24 and 25. Slide 25 names two
 *    nodes «i»; here they are i1 (h 3) and i2 (h 9), both shown as «i».
 *
 * Each algorithm follows the lecture:
 *  - Greedy BestFS (slides 11–12): take the first state of the frontier; skip
 *    it if closed (loop); stop if final; otherwise Frontier ← Next ∪ Frontier,
 *    sorted by h (stable, so on equal h the new children come first).
 *  - HC (slides 19–20): move to the child with the smallest h, keeping no
 *    frontier. It stops at a final state or a state with no children, and
 *    here also when it would return to a state it has visited (the lecture's
 *    loop would never end).
 *  - Beam (slides 22–23): like Greedy BestFS, but children already closed are
 *    dropped and only the best N = 2 states of the frontier are kept. Slide 23
 *    writes «if (S ∉ Closed) Next ← Next − {S}»; it should be S ∈ Closed.
 *  - A* (slides 26–28): as Greedy, sorted by f = g + h; a child already in the
 *    frontier is kept only if its new path is cheaper (the old one is removed).
 */

export type ProblemId = 'maze' | 'book' | 'roads' | 'ex1' | 'ex2';
export type AlgorithmId = 'GREEDY' | 'HC' | 'BEAM' | 'ASTAR';
export type RowKind = 'expand' | 'loop' | 'goal' | 'stuck' | 'cycle';

export interface Node {
  id: string;
  label: string;
  h: number;
  /** Drawing position: grid cell for the maze, pixels for the graphs. */
  x: number;
  y: number;
}

export interface Problem {
  id: ProblemId;
  label: string;
  start: string;
  nodes: Node[];
  /** Ordered successors with step costs. Trees list only children. */
  next: Record<string, [string, number][]>;
  /** Drawn edges [from, to, cost]; trees are directed. */
  edges: [string, string, number][];
  directed: boolean;
  /** Mazes only: grid size, walls and the name of the exit (F or G). */
  grid?: { w: number; h: number; walls: string[]; goal: string };
}

export interface FrontierItem {
  id: string;
  g: number;
}

export interface Row {
  /** State taken from the frontier (or HC's current state). */
  id: string;
  /** Frontier before the step, in order. */
  frontier: FrontierItem[];
  closed: string[];
  /** Children produced by the step, with their g. */
  children: FrontierItem[];
  kind: RowKind;
  /** Path cost from the start to `id` along the path found. */
  g: number;
  /** Path from the start to `id`. */
  path: string[];
}

// ---- Problems ---------------------------------------------------------------

const MOVES: [number, number][] = [[-1, 0], [0, 1], [1, 0], [0, -1]]; // αριστερά, πάνω, δεξιά, κάτω

/**
 * A grid maze from rows of text, top row first: '#' wall, '.' free, 'S' start,
 * and the goal letter. h is the Manhattan distance to the goal.
 */
function grid(id: ProblemId, label: string, rows: string[], goalName: string): Problem {
  const H = rows.length;
  const W = rows[0]!.length;
  const at = (x: number, y: number) => rows[H - y]![x - 1]!;
  const wall = (x: number, y: number) => at(x, y) === '#';
  const find = (c: string) => {
    for (let y = 1; y <= H; y++) for (let x = 1; x <= W; x++) if (at(x, y) === c) return [x, y] as const;
    throw new Error(`no ${c} in ${id}`);
  };
  const [sx, sy] = find('S');
  const [gx, gy] = find(goalName);
  const nodes: Node[] = [];
  const next: Problem['next'] = {};
  const walls: string[] = [];
  for (let y = 1; y <= H; y++) {
    for (let x = 1; x <= W; x++) {
      const cell = `${x}-${y}`;
      if (wall(x, y)) {
        walls.push(cell);
        continue;
      }
      // Shown as <x,y>, like the book's tables (which write 34⁸ for <3,4> with h = 8).
      nodes.push({ id: cell, label: `<${x},${y}>`, h: Math.abs(x - gx) + Math.abs(y - gy), x, y });
      next[cell] = MOVES.map(([dx, dy]) => [x + dx, y + dy] as const)
        .filter(([a, b]) => a >= 1 && a <= W && b >= 1 && b <= H && !wall(a, b))
        .map(([a, b]) => [`${a}-${b}`, 1]);
    }
  }
  return { id, label, start: `${sx}-${sy}`, nodes, next, edges: [], directed: false, grid: { w: W, h: H, walls, goal: goalName } };
}

// Lecture 3, slide 14 (10 × 6).
const MAZE = grid('maze', 'Λαβύρινθος', [
  '...#....##',
  '.#..S#....',
  '####...#..',
  '...##..#F.',
  '.#....##.#',
  '.#...#....',
], 'F');

// The book, Σχήμα 4.5 (10 × 10).
const BOOK = grid('book', 'Λαβύρινθος βιβλίου', [
  '##.....###',
  '##.....###',
  '......G...',
  '...##.....',
  '...####...',
  '...#####..',
  '..S###....',
  '..#####...',
  '..#####.##',
  '........##',
], 'G');

function graph(id: ProblemId, label: string, start: string, nodes: [string, number, number, number][], edges: [string, string, number][], directed: boolean, display: (id: string) => string = (x) => x): Problem {
  const next: Problem['next'] = Object.fromEntries(nodes.map(([n]) => [n, []]));
  for (const [a, b, c] of edges) {
    next[a]!.push([b, c]);
    if (!directed) next[b]!.push([a, c]);
  }
  if (!directed) for (const n of Object.keys(next)) next[n]!.sort((p, q) => p[0].localeCompare(q[0]));
  return { id, label, start, nodes: nodes.map(([n, h, x, y]) => ({ id: n, label: display(n), h, x, y })), next, edges, directed };
}

const ROADS = graph('roads', 'Δρόμοι', 'S',
  [['S', 6, 90, 260], ['A', 3, 300, 110], ['B', 4, 300, 410], ['C', 3, 510, 260], ['D', 1, 510, 500], ['G', 0, 710, 380]],
  [['S', 'A', 2], ['S', 'B', 4], ['A', 'C', 5], ['B', 'C', 1], ['B', 'D', 5], ['C', 'G', 3], ['D', 'G', 1]], false);

const EX1 = graph('ex1', 'Άσκηση 1', 'a',
  [['a', 10, 400, 50], ['b', 10, 180, 170], ['c', 6, 400, 170], ['d', 8, 620, 170], ['e', 12, 100, 300], ['f', 4, 260, 300],
   ['i', 0, 260, 420], ['g', 6, 540, 300], ['h', 10, 700, 300], ['j', 9, 540, 420], ['k', 0, 540, 540]],
  [['a', 'b', 1], ['a', 'c', 1], ['a', 'd', 1], ['b', 'e', 1], ['b', 'f', 1], ['f', 'i', 1], ['d', 'g', 1], ['d', 'h', 1], ['g', 'j', 1], ['j', 'k', 1]], true);

const EX2 = graph('ex2', 'Άσκηση 2', 'c',
  [['c', 10, 400, 45], ['b', 7, 150, 150], ['d', 4, 400, 150], ['i1', 3, 640, 150], ['k', 5, 70, 260], ['i2', 9, 230, 260],
   ['a', 12, 400, 260], ['g', 5, 580, 260], ['h', 10, 730, 260], ['o', 7, 70, 370], ['e', 0, 230, 370], ['l', 0, 400, 370],
   ['m', 11, 530, 370], ['f', 3, 680, 370], ['p', 0, 70, 480], ['q', 2, 470, 480], ['r', 0, 590, 480], ['n', 1, 680, 480]],
  [['c', 'b', 1], ['c', 'd', 1], ['c', 'i1', 1], ['b', 'k', 1], ['b', 'i2', 1], ['k', 'o', 1], ['o', 'p', 1], ['i2', 'e', 1],
   ['d', 'a', 1], ['a', 'l', 1], ['i1', 'g', 1], ['i1', 'h', 1], ['g', 'm', 1], ['g', 'f', 1], ['m', 'q', 1], ['m', 'r', 1], ['f', 'n', 1]],
  true, (id) => id.replace(/\d$/, ''));

export const PROBLEMS: Problem[] = [MAZE, BOOK, ROADS, EX1, EX2];
export const problem = (id: ProblemId): Problem => PROBLEMS.find((p) => p.id === id)!;

export const ALGORITHMS: { id: AlgorithmId; label: string; problems: ProblemId[] }[] = [
  { id: 'GREEDY', label: 'Greedy BestFS', problems: ['maze', 'book', 'roads', 'ex1', 'ex2'] },
  { id: 'HC', label: 'Hill Climbing', problems: ['maze', 'book', 'roads', 'ex1', 'ex2'] },
  { id: 'BEAM', label: 'Beam (N = 2)', problems: ['maze', 'book', 'roads', 'ex1', 'ex2'] },
  // The exercise trees have no step costs, so A* runs on the mazes and the roads.
  { id: 'ASTAR', label: 'A*', problems: ['maze', 'book', 'roads'] },
];

export const BEAM_WIDTH = 2;

// ---- Algorithms -------------------------------------------------------------

const isGoal = (p: Problem, id: string) => p.nodes.find((n) => n.id === id)!.h === 0;

export function hOf(p: Problem, id: string): number {
  return p.nodes.find((n) => n.id === id)!.h;
}

/** Stable sort, so equal values keep their order (new children first). */
const stableBy = <T>(xs: T[], key: (x: T) => number) =>
  xs.map((x, i) => [x, i] as const).sort((a, b) => key(a[0]) - key(b[0]) || a[1] - b[1]).map(([x]) => x);

function bestFirst(p: Problem, alg: 'GREEDY' | 'BEAM' | 'ASTAR'): Row[] {
  const rows: Row[] = [];
  const h = (id: string) => hOf(p, id);
  const value = (it: FrontierItem) => (alg === 'ASTAR' ? it.g + h(it.id) : h(it.id));
  let frontier: FrontierItem[] = [{ id: p.start, g: 0 }];
  const closed: string[] = [];
  const parent = new Map<string, string | null>([[p.start, null]]);
  const pathTo = (id: string) => {
    const out = [id];
    for (let q = parent.get(id); q; q = parent.get(q)) out.unshift(q);
    return out;
  };
  for (let guard = 0; frontier.length && guard < 500; guard++) {
    const cur = frontier[0]!;
    const base = { id: cur.id, frontier: [...frontier], closed: [...closed], g: cur.g };
    frontier = frontier.slice(1);
    if (closed.includes(cur.id)) {
      rows.push({ ...base, children: [], kind: 'loop', path: pathTo(cur.id) });
      continue;
    }
    if (isGoal(p, cur.id)) {
      rows.push({ ...base, children: [], kind: 'goal', path: pathTo(cur.id) });
      break;
    }
    let kids: FrontierItem[] = p.next[cur.id]!.map(([id, c]) => ({ id, g: cur.g + c }));
    if (alg !== 'GREEDY') kids = kids.filter((k) => !closed.includes(k.id));
    if (alg === 'ASTAR') {
      kids = kids.filter((k) => !frontier.some((f) => f.id === k.id && f.g <= k.g));
      frontier = frontier.filter((f) => !kids.some((k) => k.id === f.id));
    }
    for (const k of kids) if (!closed.includes(k.id) && (alg === 'ASTAR' || !parent.has(k.id))) parent.set(k.id, cur.id);
    rows.push({ ...base, children: kids, kind: kids.length ? 'expand' : 'stuck', path: pathTo(cur.id) });
    closed.push(cur.id);
    frontier = stableBy([...kids, ...frontier], value);
    if (alg === 'BEAM') frontier = frontier.slice(0, BEAM_WIDTH);
  }
  return rows;
}

function hillClimbing(p: Problem): Row[] {
  const rows: Row[] = [];
  const path = [p.start];
  let g = 0;
  for (let guard = 0; guard < 200; guard++) {
    const id = path.at(-1)!;
    const base = { id, frontier: [{ id, g }], closed: path.slice(0, -1), g, path: [...path] };
    if (isGoal(p, id)) {
      rows.push({ ...base, children: [], kind: 'goal' });
      break;
    }
    const kids: FrontierItem[] = p.next[id]!.map(([k, c]) => ({ id: k, g: g + c }));
    if (!kids.length) {
      rows.push({ ...base, children: [], kind: 'stuck' });
      break;
    }
    const best = stableBy(kids, (k) => hOf(p, k.id))[0]!;
    if (path.includes(best.id)) {
      rows.push({ ...base, children: kids, kind: 'cycle' });
      break;
    }
    rows.push({ ...base, children: kids, kind: 'expand' });
    path.push(best.id);
    g = best.g;
  }
  return rows;
}

export function run(problemId: ProblemId, alg: AlgorithmId): Row[] {
  const p = problem(problemId);
  return alg === 'HC' ? hillClimbing(p) : bestFirst(p, alg);
}

/** For HC: the child it moves to (the one with the smallest h). */
export function hcChoice(p: Problem, r: Row): string | undefined {
  return r.children.length ? stableBy(r.children, (k) => hOf(p, k.id))[0]!.id : undefined;
}

/**
 * «Πρόβλεψη» mode: before row `i` is shown, the explorer asks which state the
 * algorithm takes next. The answer is that row's state; the options are the
 * children of the previous row plus the front of row i's frontier (best-first)
 * or just the previous row's children (HC), one per state, in label order so
 * the order gives nothing away. No question for the first row (always S).
 */
export function predictOptions(p: Problem, rows: Row[], i: number, alg: AlgorithmId): { answer: string; options: FrontierItem[] } | undefined {
  const row = rows[i];
  const prev = rows[i - 1];
  if (!row || !prev) return undefined;
  const pool = alg === 'HC' ? prev.children : [...row.frontier.slice(0, 4), ...prev.children];
  const byId = new Map<string, FrontierItem>();
  for (const it of pool) if (!byId.has(it.id)) byId.set(it.id, it);
  if (!byId.has(row.id)) return undefined;
  const label = (id: string) => p.nodes.find((n) => n.id === id)!.label;
  const options = [...byId.values()].sort((a, b) => label(a.id).localeCompare(label(b.id), 'el', { numeric: true }));
  return options.length > 1 ? { answer: row.id, options } : undefined;
}
