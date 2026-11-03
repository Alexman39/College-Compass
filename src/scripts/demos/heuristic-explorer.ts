/**
 * Interactive explorer of the heuristic search algorithms (CN6005 Week 3):
 * Greedy BestFS, Hill Climbing, Beam Search and A* on the lecture's maze, a
 * small road network and the two exercise trees. Mounted into
 * <div data-demo="heuristic-explorer"> by src/scripts/demos.ts. The traces
 * come from src/lib/heuristic-explorer.ts (tested); this file only draws them.
 * Styles: water-jug.css and search-explorer.css (shared look, full screen) +
 * heuristic-explorer.css.
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
  maze: 'Ο λαβύρινθος της διάλεξης (διαφάνεια 14): S = 5-5, F = 9-3, h = απόσταση Manhattan, κάθε κίνηση κοστίζει 1. Σειρά κινήσεων: αριστερά, πάνω, δεξιά, κάτω.',
  roads: 'Το οδικό δίκτυο των σημειώσεων (δικό μας παράδειγμα). Αριθμοί στους δρόμους: κόστος· h = εκτίμηση της απόστασης ως το G.',
  ex1: 'Η Άσκηση 1 της διάλεξης (διαφάνεια 24). Δοκίμασε πρώτα μόνος σου και μετά έλεγξε εδώ. Τερματικοί κόμβοι: όσοι έχουν h = 0.',
  ex2: 'Η Άσκηση 2 της διάλεξης (διαφάνεια 25). Η διαφάνεια έχει δύο κόμβους «i» (h = 3 και h = 9)· είναι διαφορετικοί κόμβοι.',
};

export function mount(root: HTMLElement): void {
  let prob: ProblemId = 'maze';
  let alg: AlgorithmId = 'GREEDY';
  let step = 0;
  let rows: Row[] = run(prob, alg);
  const P = () => problem(prob);
  const label = (id: string) => P().nodes.find((n) => n.id === id)!.label;
  const value = (it: FrontierItem) => (alg === 'ASTAR' ? `${label(it.id)}(${it.g}+${hOf(P(), it.id)})` : `${label(it.id)}(${hOf(P(), it.id)})`);
  const list = (xs: FrontierItem[]) => (xs.length ? `<${xs.map(value).join(', ')}>` : '∅');
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
  const fsBtn = h('button', { type: 'button', class: 'jug-fs', 'aria-pressed': 'false' }, '⛶ Πλήρης οθόνη');
  toolbar.append(probGroup, algGroup, fsBtn);

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
  controls.append(resetBtn, prevBtn, nextBtn, endBtn);
  panel.append(head, bar, controls);

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
  right.append(metrics, explanation, tableTitle, tableWrap);
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
  function classOf(id: string, current: Row | undefined, closed: Set<string>, reached: boolean) {
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
    for (const w of g.walls) {
      const [x, y] = w.split('-').map(Number) as [number, number];
      s('rect', { x: X(x), y: Y(y), width: cs, height: cs, class: 'hx-wall' }, svg);
    }
    for (const n of P().nodes) {
      const goal = n.h === 0;
      const cls = classOf(n.id, current, closed, reached);
      const gEl = s('g', { class: `jug-node hx-cell ${cls} ${goal ? 'hx-target' : ''}` }, svg);
      s('rect', { x: X(n.x), y: Y(n.y), width: cs, height: cs, class: 'box' }, gEl);
      const name = n.id === P().start ? 'S' : goal ? 'F' : '';
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
        return `Η ${L} είναι τελική κατάσταση (h = 0). Διαδρομή ${r.path.map(label).join(' → ')}${prob === 'maze' || prob === 'roads' ? `, κόστος ${r.g}` : ''}.`;
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
      ['Τρέχουσα', label(id)],
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

  function render() {
    const max = rows.length;
    const active = step - 1;
    const current = rows[active];
    const reached = rows.slice(0, step).some((r) => r.kind === 'goal');
    const closed = new Set(current ? [...current.closed, current.id] : []);
    const last = rows.at(-1);

    sub.textContent = ABOUT[alg];
    treeTitle.textContent = P().grid ? 'Λαβύρινθος' : prob === 'roads' ? 'Οδικό δίκτυο' : `Δένδρο της ${P().label === 'Άσκηση 1' ? 'Άσκησης 1' : 'Άσκησης 2'}`;
    stepLabel.textContent = `Βήμα ${step} / ${max}`;
    fill.style.width = `${max ? (step / max) * 100 : 0}%`;
    bar.setAttribute('aria-valuemax', String(max));
    bar.setAttribute('aria-valuenow', String(step));
    status.textContent = !current ? 'Αρχική κατάσταση' : current.kind === 'goal' ? 'Βρέθηκε λύση' : current.kind === 'stuck' && alg === 'HC' ? 'Αδιέξοδο' : current.kind === 'cycle' ? 'Βρόχος' : `Κατάσταση ${label(current.id)}`;
    resetBtn.disabled = prevBtn.disabled = step === 0;
    nextBtn.disabled = endBtn.disabled = step === max;

    svg.replaceChildren();
    if (P().grid) drawMaze(current, closed, reached);
    else drawGraph(current, closed, reached);
    svg.setAttribute('aria-label', current ? `Τρέχουσα κατάσταση ${label(current.id)}.` : 'Αρχική κατάσταση.');

    renderMetrics(current);
    let text = explain(current);
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
      const shown = i < step;
      tr.append(h('td', {}, String(i + 1)));
      for (const v of [list(r.frontier), set(r.closed), label(r.id), lastCell(r)]) tr.append(h('td', shown ? {} : { class: 'hidden-cell' }, shown ? v : '—'));
      tbody.append(tr);
    });
    const row = tbody.children[active] as HTMLElement | undefined;
    if (row) tableWrap.scrollTop = Math.max(0, row.offsetTop - tableWrap.clientHeight / 2);

    foot.textContent = `${NOTE[prob]} Στο μέτωπο, δίπλα σε κάθε κατάσταση η τιμή με την οποία ταξινομείται: ${alg === 'ASTAR' ? 'g + h' : 'h'}.`;
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

  nextBtn.addEventListener('click', () => { step = Math.min(rows.length, step + 1); render(); });
  prevBtn.addEventListener('click', () => { step = Math.max(0, step - 1); render(); });
  resetBtn.addEventListener('click', () => { step = 0; render(); });
  endBtn.addEventListener('click', () => { step = rows.length; render(); });

  reset();
}
