/**
 * Interactive DFS / BFS on the two-glasses problem (CN6005 Week 2).
 * Mounted into <div data-demo="water-jug"> by src/scripts/demos.ts.
 * Step through the search row by row (or cell by cell) and watch the tree,
 * the frontier and the closed set change. The search itself is in
 * src/lib/water-jug.ts, tested against the lecture's DFS table.
 */
import './water-jug.css';
import { NODES, formatClosed, formatFrontier, node, trace, type Algorithm, type TraceRow } from '~/lib/water-jug';

const SVG = 'http://www.w3.org/2000/svg';
const CELLS = 4; // frontier, closed, state, children
// In "per cell" mode a row is revealed closed set first, then frontier,
// state and children (the column order on screen is frontier, closed, …).
const REVEAL = [1, 0, 2, 3];

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

export function mount(root: HTMLElement): void {
  let alg: Algorithm = 'DFS';
  let mode: 'row' | 'cell' = 'row';
  let step = 0;
  let rows: TraceRow[] = trace(alg);

  root.replaceChildren();
  root.classList.add('jug');

  const sub = h('p', { class: 'jug-sub' }, 'Δύο ποτήρια 70 ml και 50 ml · Στόχος: 40 ml');

  const toolbar = h('div', { class: 'jug-toolbar' });
  const algGroup = h('div', { class: 'jug-seg', role: 'group', 'aria-label': 'Αλγόριθμος' });
  const dfsBtn = h('button', { type: 'button', 'aria-pressed': 'true' }, 'DFS · Στοίβα');
  const bfsBtn = h('button', { type: 'button', 'aria-pressed': 'false' }, 'BFS · Ουρά');
  algGroup.append(dfsBtn, bfsBtn);
  const modeId = `jug-mode-${Math.random().toString(36).slice(2, 8)}`;
  const modeLabel = h('label', { for: modeId }, 'Εκτέλεση:');
  const modeSelect = h('select', { id: modeId });
  modeSelect.append(h('option', { value: 'row' }, 'Ανά γραμμή'), h('option', { value: 'cell' }, 'Ανά κελί'));
  const modeWrap = h('div', { class: 'jug-mode' });
  modeWrap.append(modeLabel, modeSelect);
  const fsBtn = h('button', { type: 'button', class: 'jug-fs', 'aria-pressed': 'false' }, '⛶ Πλήρης οθόνη');
  const tools = h('div', { class: 'jug-mode' });
  tools.append(modeWrap, fsBtn);
  toolbar.append(algGroup, tools);

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

  const treeTitle = h('h3', { class: 'jug-h' }, 'Δέντρο καταστάσεων');
  const treeWrap = h('div', { class: 'jug-scroll jug-tree' });
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 800 590');
  svg.setAttribute('role', 'img');
  treeWrap.append(svg);

  const legend = h('div', { class: 'jug-legend' });
  for (const [cls, text] of [['current', 'Τρέχουσα'], ['child', 'Παιδιά'], ['goal', 'Στόχος'], ['path', 'Ενεργή διαδρομή']]) {
    const item = h('span');
    item.append(h('i', { class: `jug-swatch ${cls}`, 'aria-hidden': 'true' }), document.createTextNode(text!));
    legend.append(item);
  }

  const explanation = h('p', { class: 'jug-panel jug-note', 'aria-live': 'polite' });

  const tableTitle = h('h3', { class: 'jug-h' }, 'Πίνακας εκτέλεσης');
  const tableWrap = h('div', { class: 'jug-scroll jug-table', tabindex: '0', role: 'region', 'aria-label': 'Πίνακας εκτέλεσης' });
  const table = h('table');
  const thead = h('thead');
  const trh = h('tr');
  for (const t of ['#', 'Μέτωπο αναζήτησης', 'Κλειστό σύνολο', 'Κατάσταση', 'Παιδιά']) trh.append(h('th', { scope: 'col' }, t));
  thead.append(trh);
  const tbody = h('tbody');
  table.append(thead, tbody);
  tableWrap.append(table);

  const foot = h(
    'p',
    { class: 'jug-sub' },
    'Η εκτέλεση του DFS είναι ο πίνακας της διάλεξης (διαφάνεια 21). Ο BFS εφαρμόζεται με τον ίδιο αλγόριθμο στο ίδιο δέντρο. «Βρόχος» σημαίνει ότι η κατάσταση έχει ήδη εξεταστεί (είναι στο κλειστό σύνολο), άρα δεν επεκτείνεται ξανά.',
  );

  // Tree on one side, explanation and table on the other (side by side in
  // full screen; stacked in the page).
  const left = h('div', { class: 'jug-left' });
  left.append(treeTitle, treeWrap, legend);
  const right = h('div', { class: 'jug-right' });
  right.append(explanation, tableTitle, tableWrap);
  const body = h('div', { class: 'jug-body' });
  body.append(left, right);
  root.append(sub, toolbar, panel, body, foot);

  // Full screen: the real Fullscreen API where there is one, and in any case
  // a fixed overlay, so it also works on phones that only allow it for video.
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

  const perRow = () => (mode === 'cell' ? CELLS : 1);
  const maxStep = () => rows.length * perRow();

  function drawTree(current: TraceRow | undefined, reached: Set<string>) {
    svg.replaceChildren();
    const path = new Set<string>();
    for (let p = current?.id ?? null; p; p = node(p).parent) path.add(p);
    const kids = new Set(current?.children ?? []);

    for (const n of NODES.filter((n) => n.parent)) {
      const q = node(n.parent!);
      const cls = path.has(n.id) && path.has(q.id) ? 'path' : kids.has(n.id) ? 'child' : '';
      s('line', { x1: q.x, y1: q.y + 24, x2: n.x, y2: n.y - 24, class: `jug-edge ${cls}` }, svg);
    }
    for (const n of NODES) {
      const isCurrent = current?.id === n.id;
      const cls = isCurrent ? 'current' : n.id === 'k' && reached.has('k') ? 'goal' : kids.has(n.id) ? 'child' : '';
      const g = s('g', { class: `jug-node ${cls}` }, svg);
      s('rect', { x: n.x - 37, y: n.y - 23, width: 74, height: 47, rx: 6, class: 'box' }, g);
      // the two glasses, water drawn to scale (70 ml and 50 ml)
      [
        [n.big, 70, n.x - 29, n.y - 15, 25, 30],
        [n.small, 50, n.x + 3, n.y - 9, 21, 24],
      ].forEach(([v, cap, x, y, w, hh]) => {
        s('rect', { x: x!, y: y!, width: w!, height: hh!, class: 'glass' }, g);
        if (v) {
          const level = ((hh! - 2) * v!) / cap!;
          s('rect', { x: x! + 1, y: y! + hh! - level - 1, width: w! - 2, height: level, class: 'water' }, g);
        }
      });
      s('text', { x: n.x, y: n.y - 30, 'text-anchor': 'middle', class: 'name' }, g).textContent = n.label;
      s('text', { x: n.x, y: n.y + 40, 'text-anchor': 'middle', class: 'ml' }, g).textContent = `${n.big}/${n.small} ml`;
      if (isCurrent) s('circle', { cx: n.x + 38, cy: n.y - 23, r: 7, class: 'dot' }, g);
    }
    svg.setAttribute(
      'aria-label',
      current
        ? `Δέντρο αναζήτησης. Τρέχουσα κατάσταση ${node(current.id).label} (${node(current.id).big}, ${node(current.id).small}).`
        : 'Δέντρο αναζήτησης του προβλήματος των ποτηριών.',
    );
  }

  function render() {
    const per = perRow();
    const max = maxStep();
    const active = step ? Math.floor((step - 1) / per) : -1;
    const current = rows[active];
    const done = mode === 'cell' ? Math.floor(step / CELLS) : step;
    const reached = new Set(rows.slice(0, active + 1).map((r) => r.id));

    stepLabel.textContent = `Βήμα ${done} / ${rows.length}`;
    fill.style.width = `${(step / max) * 100}%`;
    bar.setAttribute('aria-valuemax', String(max));
    bar.setAttribute('aria-valuenow', String(step));
    status.textContent = !current ? 'Αρχική κατάσταση' : current.goal ? 'Βρέθηκε η λύση' : `Κατάσταση ${node(current.id).label}`;
    resetBtn.disabled = prevBtn.disabled = step === 0;
    nextBtn.disabled = endBtn.disabled = step === max;

    drawTree(current, reached);

    const n = current && node(current.id);
    explanation.textContent = !current
      ? 'Ξεκινάμε από την κατάσταση Α (0, 0). Το κλειστό σύνολο είναι κενό.'
      : current.goal
        ? 'ΤΕΛΙΚΗ: Η κατάσταση Κ περιέχει 40 ml στο μεγάλο ποτήρι και 50 ml στο μικρό.'
        : current.loop
          ? `Βρόχος: η κατάσταση ${n!.label} έχει ήδη εξεταστεί, άρα δεν επεκτείνεται.`
          : `Εξετάζουμε την κατάσταση ${n!.label} (${n!.big}, ${n!.small} ml). Παιδιά: ${formatFrontier(current.children)}. Στον ${alg} προστίθενται ${alg === 'DFS' ? 'στην αρχή' : 'στο τέλος'} του μετώπου.`;

    tbody.replaceChildren();
    rows.forEach((r, i) => {
      const tr = h('tr');
      if (i === active) tr.classList.add('current');
      if (r.goal && i <= active) tr.classList.add('goal');
      const values = [
        formatFrontier(r.frontier),
        formatClosed(r.closed),
        node(r.id).label,
        r.goal ? 'ΤΕΛΙΚΗ' : r.loop ? '— (βρόχος)' : formatFrontier(r.children),
      ];
      tr.append(h('td', {}, String(i + 1)));
      values.forEach((v, j) => {
        const shown = mode === 'row' ? i < step : i * CELLS + REVEAL.indexOf(j) < step;
        tr.append(h('td', shown ? {} : { class: 'hidden-cell' }, shown ? v : '—'));
      });
      tbody.append(tr);
    });
    // keep the current row in view inside the table (not the page)
    const row = tbody.children[active] as HTMLElement | undefined;
    if (row) tableWrap.scrollTop = Math.max(0, row.offsetTop - tableWrap.clientHeight / 2);
  }

  function setAlg(next: Algorithm) {
    alg = next;
    step = 0;
    rows = trace(alg);
    dfsBtn.setAttribute('aria-pressed', String(alg === 'DFS'));
    bfsBtn.setAttribute('aria-pressed', String(alg === 'BFS'));
    render();
  }

  dfsBtn.addEventListener('click', () => setAlg('DFS'));
  bfsBtn.addEventListener('click', () => setAlg('BFS'));
  modeSelect.addEventListener('change', () => {
    mode = modeSelect.value as 'row' | 'cell';
    step = 0;
    render();
  });
  nextBtn.addEventListener('click', () => { step = Math.min(maxStep(), step + 1); render(); });
  prevBtn.addEventListener('click', () => { step = Math.max(0, step - 1); render(); });
  resetBtn.addEventListener('click', () => { step = 0; render(); });
  endBtn.addEventListener('click', () => { step = maxStep(); render(); });

  render();
}
