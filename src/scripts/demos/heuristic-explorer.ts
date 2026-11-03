/**
 * Interactive explorer of the heuristic search algorithms (CN6005 Week 3):
 * Greedy BestFS, Hill Climbing, Beam Search and A* on the lecture's maze, a
 * small road network and the two exercise trees. Mounted into
 * <div data-demo="heuristic-explorer"> by src/scripts/demos.ts. The traces
 * come from src/lib/heuristic-explorer.ts (tested); this file only draws them.
 * Styles: water-jug.css and search-explorer.css (shared look, full screen) +
 * heuristic-explorer.css.
 *
 * Optional presets: data-problem="ex2" data-algorithm="GREEDY" open the
 * explorer on that problem and algorithm. The «Ανά κελί» mode, the slider,
 * the frontier/closed/children chips and the faded unseen states come from
 * the user's greedy-best-first-visualizer.html (Άσκηση 2).
 */
import './water-jug.css';
import './search-explorer.css';
import './heuristic-explorer.css';
import {
  ALGORITHMS,
  BEAM_WIDTH,
  PROBLEMS,
  hOf,
  hcChoice,
  problem,
  run,
  type AlgorithmId,
  type FrontierItem,
  type ProblemId,
  type Row,
} from '~/lib/heuristic-explorer';

const SVG = 'http://www.w3.org/2000/svg';
const CELLS = 4; // frontier, closed, state, children
// In «Ανά κελί» a row is revealed closed set first, then frontier, state and
// children (on screen the columns are frontier, closed, …), as in Week 2.
const REVEAL = [1, 0, 2, 3];
const CELL_NAMES = ['Κλειστό σύνολο', 'Μέτωπο', 'Κατάσταση', 'Παιδιά'];
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
/** 12 → ¹², for the book's notation <3,4>⁸. */
const sup = (n: number) => [...String(n)].map((d) => SUP[Number(d)]).join('');

function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, text?: string) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text;
  return e;
}

function s(tag: string, attrs: Record<string, string | number>, parent: Element) {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent.append(e);
  return e;
}

const ABOUT: Record<AlgorithmId, string> = {
  GREEDY: 'Greedy BestFS: επεκτείνει την κατάσταση του μετώπου με τη μικρότερη h και κρατά τις υπόλοιπες.',
  HC: 'Hill Climbing: πηγαίνει στο παιδί με τη μικρότερη h και πετάει όλα τα άλλα. Δεν κρατά μέτωπο.',
  BEAM: `Beam Search: σαν τον Greedy, αλλά κρατά μόνο τις N = ${BEAM_WIDTH} καλύτερες καταστάσεις του μετώπου.`,
  ASTAR: 'A*: ταξινομεί το μέτωπο κατά f = g + h, δηλαδή κόστος που έγινε συν εκτίμηση για όσο απομένει.',
};

const NOTE: Record<ProblemId, string> = {
  maze: 'Ο λαβύρινθος της διάλεξης (διαφάνεια 14): S = <5,5>, F = <9,3>, h = απόσταση Manhattan, κάθε κίνηση κοστίζει 1. Σειρά κινήσεων: αριστερά, πάνω, δεξιά, κάτω.',
  book: 'Ο λαβύρινθος του βιβλίου (Σχήμα 4.5): S = <3,4>, G = <7,8>, h = απόσταση Manhattan, κάθε κίνηση κοστίζει 1. Ο Greedy BestFS αναπαράγει τον Πίνακα 4.1 του βιβλίου.',
  roads: 'Το οδικό δίκτυο των σημειώσεων (δικό μας παράδειγμα). Αριθμοί στους δρόμους: κόστος· h = εκτίμηση της απόστασης ως το G.',
  ex1: 'Η Άσκηση 1 της διάλεξης (διαφάνεια 24). Δοκίμασε πρώτα μόνος σου και μετά έλεγξε εδώ. Τερματικοί κόμβοι: όσοι έχουν h = 0.',
  ex2: 'Η Άσκηση 2 της διάλεξης (διαφάνεια 25). Η διαφάνεια έχει δύο κόμβους «i» (h = 3 και h = 9)· είναι διαφορετικοί κόμβοι.',
};

export function mount(root: HTMLElement): void {
  const isProblem = (x: string | undefined): x is ProblemId => PROBLEMS.some((p) => p.id === x);
  const isAlg = (x: string | undefined): x is AlgorithmId => ALGORITHMS.some((a) => a.id === x);
  let prob: ProblemId = isProblem(root.dataset.problem) ? root.dataset.problem : 'maze';
  let alg: AlgorithmId = isAlg(root.dataset.algorithm) && ALGORITHMS.find((a) => a.id === root.dataset.algorithm)!.problems.includes(prob) ? root.dataset.algorithm : 'GREEDY';
  let mode: 'row' | 'cell' = 'row';
  let step = 0;
  const uid = Math.random().toString(36).slice(2, 8);
  let rows: Row[] = run(prob, alg);
  const P = () => problem(prob);
  const label = (id: string) => P().nodes.find((n) => n.id === id)!.label;
  // Mazes use the book's notation: <x,y> with h as an exponent, <3,4>⁸ (A*: g+h, <3,5>¹⁺⁷).
  const value = (it: FrontierItem) => {
    const hv = hOf(P(), it.id);
    if (P().grid) return alg === 'ASTAR' ? `${label(it.id)}${sup(it.g)}⁺${sup(hv)}` : `${label(it.id)}${sup(hv)}`;
    return alg === 'ASTAR' ? `${label(it.id)}(${it.g}+${hv})` : `${label(it.id)}(${hv})`;
  };
  const state = (id: string, g: number) => (P().grid ? value({ id, g }) : label(id));
  const list = (xs: FrontierItem[]) => (xs.length ? `⟨${xs.map(value).join(', ')}⟩` : '∅');
  const set = (xs: string[]) => (xs.length ? `{${xs.map(label).join(', ')}}` : '∅');

  root.replaceChildren();
  root.classList.add('jug', 'sx', 'hx');

  const sub = h('p', { class: 'jug-sub' });
  const toolbar = h('div', { class: 'jug-toolbar' });
  const probGroup = h('div', { class: 'jug-seg sx-algs', role: 'group', 'aria-label': 'Πρόβλημα' });
  const probBtns = PROBLEMS.map((p) => {
    const b = h('button', { type: 'button', 'aria-pressed': String(p.id === prob) }, p.label);
    b.addEventListener('click', () => setProblem(p.id));
    probGroup.append(b);
    return b;
  });
  const algGroup = h('div', { class: 'jug-seg sx-algs', role: 'group', 'aria-label': 'Αλγόριθμος' });
  const algBtns = ALGORITHMS.map((a) => {
    const b = h('button', { type: 'button', 'aria-pressed': String(a.id === alg) }, a.label);
    b.addEventListener('click', () => setAlg(a.id));
    algGroup.append(b);
    return b;
  });
  const modeLabel = h('span', { class: 'jug-mode-label', id: `hx-mode-${Math.random().toString(36).slice(2, 8)}` }, 'Εκτέλεση:');
  const modeGroup = h('div', { class: 'jug-seg', role: 'group', 'aria-labelledby': modeLabel.id });
  const rowBtn = h('button', { type: 'button', 'aria-pressed': 'true' }, 'Ανά γραμμή');
  const cellBtn = h('button', { type: 'button', 'aria-pressed': 'false' }, 'Ανά κελί');
  modeGroup.append(rowBtn, cellBtn);
  const modeWrap = h('div', { class: 'jug-mode' });
  modeWrap.append(modeLabel, modeGroup);
  const fsBtn = h('button', { type: 'button', class: 'jug-fs', 'aria-pressed': 'false' }, '⛶ Πλήρης οθόνη');
  const tools = h('div', { class: 'jug-mode' });
  tools.append(modeWrap, fsBtn);
  toolbar.append(probGroup, algGroup, tools);

  const panel = h('div', { class: 'jug-panel' });
  const head = h('div', { class: 'jug-head' });
  const stepLabel = h('strong');
  const status = h('span', { class: 'jug-status', 'aria-live': 'polite' });
  head.append(stepLabel, status);
  const bar = h('div', { class: 'jug-progress', role: 'progressbar', 'aria-label': 'Πρόοδος', 'aria-valuemin': '0' });
  const fill = h('div');
  bar.append(fill);
  const controls = h('div', { class: 'jug-controls' });
  const resetBtn = h('button', { type: 'button' }, '↺ Reset');
  const prevBtn = h('button', { type: 'button' }, '← Πίσω');
  const nextBtn = h('button', { type: 'button', class: 'primary' }, 'Επόμενο →');
  const endBtn = h('button', { type: 'button' }, 'Τέλος ⇥');
  const scrub = h('input', { type: 'range', min: '0', value: '0', class: 'hx-scrub', 'aria-label': 'Μετάβαση σε βήμα' });
  controls.append(resetBtn, prevBtn, nextBtn, endBtn, scrub);
  const hint = h('p', { class: 'jug-sub hx-hint' });
  panel.append(head, bar, controls, hint);

  const treeTitle = h('h3', { class: 'jug-h' });
  const treeWrap = h('div', { class: 'jug-scroll jug-tree' });
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('role', 'img');
  treeWrap.append(svg);
  const legend = h('div', { class: 'jug-legend' });
  for (const [cls, text] of [['current', 'Τρέχουσα'], ['child', 'Παιδιά'], ['closed', 'Κλειστό σύνολο'], ['goal', 'Στόχος'], ['path', 'Διαδρομή']]) {
    const item = h('span');
    item.append(h('i', { class: `jug-swatch ${cls}`, 'aria-hidden': 'true' }), document.createTextNode(text!));
    legend.append(item);
  }
  const metrics = h('div', { class: 'sx-metrics' });
  const memory = h('div', { class: 'hx-memory' });
  const explanation = h('p', { class: 'jug-panel jug-note', 'aria-live': 'polite' });
  const tableTitle = h('h3', { class: 'jug-h' }, 'Πίνακας εκτέλεσης');
  const tableWrap = h('div', { class: 'jug-scroll jug-table', tabindex: '0', role: 'region', 'aria-label': 'Πίνακας εκτέλεσης' });
  const table = h('table');
  const thead = h('thead');
  const tbody = h('tbody');
  table.append(thead, tbody);
  tableWrap.append(table);
  const foot = h('p', { class: 'jug-sub' });

  const left = h('div', { class: 'jug-left' });
  left.append(treeTitle, treeWrap, legend);
  const right = h('div', { class: 'jug-right' });
  right.append(metrics, memory, explanation, tableTitle, tableWrap);
  const body = h('div', { class: 'jug-body' });
  body.append(left, right);
  root.append(sub, toolbar, panel, body, foot);

  const setFull = (on: boolean) => {
    root.classList.toggle('is-full', on);
    document.documentElement.classList.toggle('jug-lock', on);
    fsBtn.setAttribute('aria-pressed', String(on));
    fsBtn.textContent = on ? '✕ Έξοδος' : '⛶ Πλήρης οθόνη';
    render();
  };
  fsBtn.addEventListener('click', () => {
    const on = !root.classList.contains('is-full');
    if (on) void root.requestFullscreen?.().catch(() => {});
    else if (document.fullscreenElement) void document.exitFullscreen();
    setFull(on);
  });
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && root.classList.contains('is-full')) setFull(false);
  });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('is-full')) setFull(false);
  });

  // ---- drawing ---------------------------------------------------------
  // States the search has not met yet (never in a frontier or a child list
  // up to this step) are faded, so the tree «opens up» as the search goes.
  let seen = new Set<string>();

  function classOf(id: string, current: Row | undefined, closed: Set<string>, reached: boolean) {
    const fade = seen.has(id) ? '' : ' hx-unseen';
    return base(id, current, closed, reached) + fade;
  }

  function base(id: string, current: Row | undefined, closed: Set<string>, reached: boolean) {
    if (current?.id === id) {
      if (reached && current.kind === 'goal') return 'goal';
      return current.kind === 'stuck' || current.kind === 'cycle' ? 'current hx-stuck' : 'current';
    }
    if (current?.children.some((c) => c.id === id)) return 'child';
    if (closed.has(id)) return 'closed';
    return '';
  }

  function drawMaze(current: Row | undefined, closed: Set<string>, reached: boolean) {
    const g = P().grid!;
    const cs = 64;
    svg.setAttribute('viewBox', `0 0 ${g.w * cs + 40} ${g.h * cs + 34}`);
    const X = (x: number) => 30 + (x - 1) * cs;
    const Y = (y: number) => 4 + (g.h - y) * cs;
    const hatch = `hx-hatch-${uid}`;
    const pat = s('pattern', { id: hatch, width: 10, height: 10, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, s('defs', {}, svg));
    s('rect', { width: 10, height: 10, class: 'hx-wall-bg' }, pat);
    s('line', { x1: 0, y1: 0, x2: 0, y2: 10, class: 'hx-wall-line' }, pat);
    for (const w of g.walls) {
      const [x, y] = w.split('-').map(Number) as [number, number];
      s('rect', { x: X(x), y: Y(y), width: cs, height: cs, class: 'hx-wall', fill: `url(#${hatch})` }, svg);
    }
    for (const n of P().nodes) {
      const goal = n.h === 0;
      const cls = classOf(n.id, current, closed, reached);
      const gEl = s('g', { class: `jug-node hx-cell ${cls} ${goal ? 'hx-target' : ''}` }, svg);
      s('rect', { x: X(n.x), y: Y(n.y), width: cs, height: cs, class: 'box' }, gEl);
      const name = n.id === P().start ? 'S' : goal ? g.goal : '';
      if (name) s('text', { x: X(n.x) + cs / 2, y: Y(n.y) + 26, 'text-anchor': 'middle', class: 'name' }, gEl).textContent = name;
      s('text', { x: X(n.x) + cs / 2, y: Y(n.y) + (name ? 48 : 38), 'text-anchor': 'middle', class: 'ml' }, gEl).textContent =
        alg === 'ASTAR' && current?.children.some((c) => c.id === n.id)
          ? `f=${current.children.find((c) => c.id === n.id)!.g + n.h}`
          : `h=${n.h}`;
    }
    for (let x = 1; x <= g.w; x++) s('text', { x: X(x) + cs / 2, y: Y(0) + 22, 'text-anchor': 'middle', class: 'hx-axis' }, svg).textContent = String(x);
    for (let y = 1; y <= g.h; y++) s('text', { x: 20, y: Y(y) + cs / 2 + 5, 'text-anchor': 'end', class: 'hx-axis' }, svg).textContent = String(y);
    if (current && current.path.length > 1) {
      const pts = current.path.map((id) => {
        const n = P().nodes.find((m) => m.id === id)!;
        return `${X(n.x) + cs / 2},${Y(n.y) + cs / 2}`;
      });
      s('polyline', { points: pts.join(' '), class: 'hx-path' }, svg);
    }
  }

  function drawGraph(current: Row | undefined, closed: Set<string>, reached: boolean) {
    svg.setAttribute('viewBox', '0 0 800 590');
    const pos = new Map(P().nodes.map((n) => [n.id, n]));
    const onPath = new Set<string>();
    const path = current?.path ?? [];
    for (let i = 1; i < path.length; i++) onPath.add(`${path[i - 1]}|${path[i]}`).add(`${path[i]}|${path[i - 1]}`);
    for (const [a, b, c] of P().edges) {
      const p = pos.get(a)!;
      const q = pos.get(b)!;
      const isKid = current && ((a === current.id && current.children.some((k) => k.id === b)) || (!P().directed && b === current.id && current.children.some((k) => k.id === a)));
      const cls = onPath.has(`${a}|${b}`) ? 'path' : isKid ? 'child' : '';
      s('line', { x1: p.x, y1: p.y, x2: q.x, y2: q.y, class: `jug-edge ${cls}` }, svg);
      if (prob === 'roads') {
        s('text', { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 - 6, 'text-anchor': 'middle', class: 'sx-cost' }, svg).textContent = String(c);
      }
    }
    for (const n of P().nodes) {
      const goal = n.h === 0;
      const cls = classOf(n.id, current, closed, reached);
      const gEl = s('g', { class: `jug-node sx-node ${cls} ${goal ? 'hx-target' : ''}` }, svg);
      s('circle', { cx: n.x, cy: n.y, r: 26, class: 'box' }, gEl);
      s('text', { x: n.x, y: n.y + 6, 'text-anchor': 'middle', class: 'name' }, gEl).textContent = n.label;
      s('text', { x: n.x, y: n.y + 46, 'text-anchor': 'middle', class: 'ml' }, gEl).textContent = `h=${n.h}`;
      if (current?.id === n.id) s('circle', { cx: n.x + 24, cy: n.y - 22, r: 7, class: 'dot' }, gEl);
    }
  }

  // ---- text ------------------------------------------------------------
  function explain(r: Row | undefined): string {
    if (!r) return `Ξεκινάμε από την ${label(P().start)}, με h = ${hOf(P(), P().start)}. Το κλειστό σύνολο είναι κενό.`;
    const L = label(r.id);
    const kids = r.children.map(value).join(', ');
    switch (r.kind) {
      case 'loop':
        return `Η ${L} είναι ήδη στο κλειστό σύνολο: βρόχος, δεν επεκτείνεται ξανά.`;
      case 'goal':
        return `Η ${L} είναι τελική κατάσταση (h = 0). Διαδρομή ${r.path.map(label).join(' → ')}${P().grid || prob === 'roads' ? `, κόστος ${r.g}` : ''}.`;
      case 'stuck':
        return alg === 'HC'
          ? `Η ${L} δεν έχει παιδιά και δεν είναι τελική. Ο Hill Climbing έχει πετάξει όλες τις άλλες επιλογές: αποτυχία.`
          : `Η ${L} δεν έχει νέα παιδιά.`;
      case 'cycle': {
        const best = hcChoice(P(), r)!;
        return `Παιδιά: ${kids}. Το καλύτερο είναι το ${label(best)}, όπου ήδη πέρασε: ο Hill Climbing θα πηγαινοερχόταν για πάντα ανάμεσα σε ${label(best)} και ${L}. Σταματάμε.`;
      }
      default:
        if (alg === 'HC') return `Παιδιά: ${kids}. Ο Hill Climbing πηγαίνει στο ${label(hcChoice(P(), r)!)} (μικρότερη h) και πετάει τα υπόλοιπα.`;
        if (alg === 'ASTAR') return `Επεκτείνουμε την ${L} (g = ${r.g}). Παιδιά: ${kids || 'κανένα νέο'}. Το μέτωπο ταξινομείται κατά f = g + h.`;
        if (alg === 'BEAM') return `Επεκτείνουμε την ${L}. Παιδιά: ${kids || 'κανένα νέο'}. Ταξινομούμε κατά h και κρατάμε τις ${BEAM_WIDTH} πρώτες.`;
        return `Επεκτείνουμε την ${L}. Παιδιά: ${kids}. Μπαίνουν στο μέτωπο, που ταξινομείται κατά h.`;
    }
  }

  // «Ανά κελί»: one sentence per cell, in the order closed set, frontier, state.
  function explainCell(r: Row, cells: number): string {
    if (cells === 1) return `Γραμμή ${rows.indexOf(r) + 1}. Κλειστό σύνολο: ${set(r.closed)}.`;
    if (cells === 2) return alg === 'HC' ? `Τρέχουσα κατάσταση: ${state(r.id, r.g)}.` : `Μέτωπο: ${list(r.frontier)}. Εξετάζεται η πρώτη του κατάσταση.`;
    return `Κατάσταση: ${state(r.id, r.g)}.${r.kind === 'loop' ? ' Είναι ήδη στο κλειστό σύνολο.' : r.kind === 'goal' ? ' Είναι τελική.' : ' Ποια είναι τα παιδιά της;'}`;
  }

  function lastCell(r: Row): string {
    if (r.kind === 'goal') return 'ΤΕΛΙΚΗ';
    if (r.kind === 'loop') return 'Βρόχος';
    if (r.kind === 'stuck') return alg === 'HC' ? '— (αδιέξοδο)' : '—';
    if (r.kind === 'cycle') return `${list(r.children)} · βρόχος`;
    return list(r.children);
  }

  function renderMetrics(current: Row | undefined) {
    const id = current?.id ?? P().start;
    const g = current?.g ?? 0;
    const cards: [string, string][] = [
      ['Τρέχουσα', state(id, g)],
      [alg === 'ASTAR' ? 'f = g + h' : 'h', alg === 'ASTAR' ? `${g} + ${hOf(P(), id)} = ${g + hOf(P(), id)}` : String(hOf(P(), id))],
      ['Κόστος g ως εδώ', String(g)],
    ];
    metrics.replaceChildren(
      ...cards.map(([k, v]) => {
        const c = h('div', { class: 'sx-metric' });
        c.append(h('span', {}, k), h('strong', {}, v));
        return c;
      }),
    );
  }

  const perRow = () => (mode === 'cell' ? CELLS : 1);
  const maxStep = () => rows.length * perRow();

  function chips(title: string, items: string[], cls = '') {
    const box = h('div', { class: 'hx-chips-box' });
    box.append(h('span', { class: 'hx-chips-title' }, title));
    const wrap = h('div', { class: 'hx-chips' });
    if (!items.length) wrap.append(h('span', { class: 'hx-chip empty' }, '∅'));
    items.forEach((t, i) => wrap.append(h('span', { class: `hx-chip ${cls} ${i === 0 && cls === 'front' ? 'first' : ''}` }, t)));
    box.append(wrap);
    return box;
  }

  function render() {
    const per = perRow();
    const max = maxStep();
    const active = step ? Math.floor((step - 1) / per) : -1;
    const done = mode === 'cell' ? Math.floor(step / CELLS) : step;
    const current = rows[active];
    // «Ανά κελί»: how many cells of the active row are shown (1 closed set,
    // 2 frontier, 3 state, 4 children). The tree, the cards and the chips
    // follow the table: until the state cell, they still show the previous row.
    const cells = mode === 'cell' && step ? ((step - 1) % CELLS) + 1 : CELLS;
    const prev = rows[active - 1];
    const shownRow = !current ? undefined : cells >= 3 ? (cells >= 4 ? current : { ...current, children: [] }) : prev;
    const reached = rows.slice(0, active + 1).some((r) => r.kind === 'goal') && cells >= 3;
    seen = new Set([P().start]);
    for (const r of rows.slice(0, active + 1)) {
      seen.add(r.id);
      r.frontier.forEach((f) => seen.add(f.id));
      r.children.forEach((c) => seen.add(c.id));
    }
    const closed = new Set(shownRow ? [...shownRow.closed, shownRow.id] : []);
    const last = rows.at(-1);

    sub.textContent = ABOUT[alg];
    treeTitle.textContent = P().grid ? P().label : prob === 'roads' ? 'Οδικό δίκτυο' : `Δένδρο της ${P().label === 'Άσκηση 1' ? 'Άσκησης 1' : 'Άσκησης 2'}`;
    stepLabel.textContent = `Βήμα ${done} / ${rows.length}`;
    scrub.max = String(max);
    scrub.value = String(step);
    hint.textContent =
      step === max ? (last?.kind === 'goal' ? 'Τέλος: βρέθηκε τελική κατάσταση.' : 'Τέλος.')
        : mode === 'cell' ? `Επόμενο κελί: ${CELL_NAMES[step % CELLS]}, γραμμή ${Math.floor(step / CELLS) + 1}.`
          : `Επόμενη γραμμή: ${step + 1}.`;
    fill.style.width = `${max ? (step / max) * 100 : 0}%`;
    bar.setAttribute('aria-valuemax', String(max));
    bar.setAttribute('aria-valuenow', String(step));
    status.textContent = !shownRow ? 'Αρχική κατάσταση' : shownRow.kind === 'goal' && reached ? 'Βρέθηκε λύση' : shownRow.kind === 'stuck' && alg === 'HC' ? 'Αδιέξοδο' : shownRow.kind === 'cycle' ? 'Βρόχος' : `Κατάσταση ${label(shownRow.id)}`;
    resetBtn.disabled = prevBtn.disabled = step === 0;
    nextBtn.disabled = endBtn.disabled = step === max;

    svg.replaceChildren();
    if (P().grid) drawMaze(shownRow, closed, reached);
    else drawGraph(shownRow, closed, reached);
    svg.setAttribute('aria-label', shownRow ? `Τρέχουσα κατάσταση ${label(shownRow.id)}.` : 'Αρχική κατάσταση.');

    renderMetrics(shownRow);
    const hidden = ['…'];
    memory.replaceChildren(
      chips('Κλειστό σύνολο', current ? current.closed.map(label) : [], 'closed'),
      chips(alg === 'HC' ? 'Τρέχουσα' : `Μέτωπο (αύξον ${alg === 'ASTAR' ? 'f' : 'h'})`, !current ? [value({ id: P().start, g: 0 })] : cells >= 2 ? current.frontier.map(value) : hidden, cells >= 2 ? 'front' : 'pending'),
      chips('Παιδιά', !current ? [] : cells >= 4 ? current.children.map(value) : hidden, cells >= 4 ? 'kids' : 'pending'),
    );
    let text = current && cells < 4 ? explainCell(current, cells) : explain(current);
    if (step === max && last && last.kind !== 'goal' && alg !== 'HC') text += ' Το μέτωπο άδειασε χωρίς να βρεθεί τελική κατάσταση: αποτυχία.';
    explanation.textContent = text;

    thead.replaceChildren();
    const trh = h('tr');
    for (const t of ['#', alg === 'HC' ? 'Τρέχουσα' : 'Μέτωπο αναζήτησης', 'Κλειστό σύνολο', 'Κατάσταση', 'Παιδιά']) trh.append(h('th', { scope: 'col' }, t));
    thead.append(trh);
    tbody.replaceChildren();
    rows.forEach((r, i) => {
      const tr = h('tr');
      if (i === active) tr.classList.add('current');
      if (r.kind === 'goal' && i <= active) tr.classList.add('goal');
      tr.append(h('td', {}, String(i + 1)));
      [list(r.frontier), set(r.closed), state(r.id, r.g), lastCell(r)].forEach((v, j) => {
        const shown = mode === 'row' ? i < step : i * CELLS + REVEAL.indexOf(j) < step;
        tr.append(h('td', shown ? {} : { class: 'hidden-cell' }, shown ? v : '—'));
      });
      tbody.append(tr);
    });
    const row = tbody.children[active] as HTMLElement | undefined;
    if (row) tableWrap.scrollTop = Math.max(0, row.offsetTop - tableWrap.clientHeight / 2);

    foot.textContent = P().grid
      ? `${NOTE[prob]} Κάθε θέση γράφεται <x,y> (στήλη, γραμμή), όπως στο βιβλίο, με εκθέτη ${alg === 'ASTAR' ? 'g + h' : 'την h της: <5,4>⁵ σημαίνει h = 5'}.`
      : `${NOTE[prob]} Στο μέτωπο, δίπλα σε κάθε κατάσταση η τιμή με την οποία ταξινομείται: ${alg === 'ASTAR' ? 'g + h' : 'h'}.`;
  }

  function setProblem(next: ProblemId) {
    prob = next;
    if (!ALGORITHMS.find((a) => a.id === alg)!.problems.includes(prob)) alg = 'GREEDY';
    reset();
  }

  function setAlg(next: AlgorithmId) {
    alg = next;
    reset();
  }

  function reset() {
    step = 0;
    rows = run(prob, alg);
    PROBLEMS.forEach((p, i) => probBtns[i]!.setAttribute('aria-pressed', String(p.id === prob)));
    ALGORITHMS.forEach((a, i) => {
      const b = algBtns[i]!;
      b.setAttribute('aria-pressed', String(a.id === alg));
      b.disabled = !a.problems.includes(prob);
      b.title = b.disabled ? 'Οι ασκήσεις δεν έχουν κόστη βημάτων' : '';
    });
    render();
  }

  const setMode = (next: 'row' | 'cell') => {
    mode = next;
    step = 0;
    rowBtn.setAttribute('aria-pressed', String(mode === 'row'));
    cellBtn.setAttribute('aria-pressed', String(mode === 'cell'));
    render();
  };
  rowBtn.addEventListener('click', () => setMode('row'));
  cellBtn.addEventListener('click', () => setMode('cell'));
  scrub.addEventListener('input', () => { step = Number(scrub.value); render(); });
  nextBtn.addEventListener('click', () => { step = Math.min(maxStep(), step + 1); render(); });
  prevBtn.addEventListener('click', () => { step = Math.max(0, step - 1); render(); });
  resetBtn.addEventListener('click', () => { step = 0; render(); });
  endBtn.addEventListener('click', () => { step = maxStep(); render(); });

  reset();
}
