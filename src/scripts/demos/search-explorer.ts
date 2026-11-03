/**
 * Interactive explorer of the search algorithms (CN6005 Week 2): DFS, BFS and
 * ID on the lecture's two-glasses tree; BiS, B&B and Beam on a small teaching
 * tree with costs and heuristic values. Mounted into
 * <div data-demo="search-explorer"> by src/scripts/demos.ts. The traces come
 * from src/lib/search-explorer.ts (tested); this file only draws them.
 * Styles: water-jug.css (shared look, full screen) + search-explorer.css.
 */
import './water-jug.css';
import './search-explorer.css';
import { ALGORITHMS, ST_GOAL, ST_NODES, g, run, stNode, type AlgorithmId, type Row } from '~/lib/search-explorer';
import { NODES as JUG_NODES, node as jugNode } from '~/lib/water-jug';

const SVG = 'http://www.w3.org/2000/svg';
const CELLS = 4; // frontier, closed, state, children
// In "per cell" mode a row is revealed closed set first, then frontier,
// state and children (the column order on screen is frontier, closed, …).
const REVEAL = [1, 0, 2, 3];
const fmt = (xs: string[]) => (xs.length ? `<${xs.join(', ')}>` : '∅');
const set = (xs: string[]) => `{${xs.join(', ')}}`;
const bound = (b: number | undefined) => (b === undefined || b === Infinity ? '∞' : String(b));

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

const EXTRA: Partial<Record<AlgorithmId, string>> = { ID: 'Όριο', BB: 'Κόστος / όριο', BiS: 'Πλευρά', BEAM: 'h' };
const ABOUT: Record<AlgorithmId, string> = {
  DFS: 'DFS: τα παιδιά μπαίνουν στην αρχή του μετώπου (στοίβα).',
  BFS: 'BFS: τα παιδιά μπαίνουν στο τέλος του μετώπου (ουρά).',
  ID: 'ID: DFS με όριο βάθους 1, 2, 3, … Κάθε γύρος ξεκινά από την αρχή.',
  BiS: 'BiS: ένα βήμα BFS από την αρχή S, ένα από τον στόχο T, εναλλάξ, μέχρι να συναντηθούν.',
  BB: 'B&B: σαν DFS, αλλά επεκτείνει μόνο ό,τι κοστίζει λιγότερο από την καλύτερη λύση ως τώρα (όριο).',
  BEAM: 'Beam (πλάτος 2): ταξινομεί το μέτωπο κατά h και κρατά μόνο τις 2 καλύτερες καταστάσεις.',
};

export function mount(root: HTMLElement): void {
  let alg: AlgorithmId = 'DFS';
  let mode: 'row' | 'cell' = 'row';
  let step = 0;
  let rows: Row[] = run(alg);
  const treeOf = () => ALGORITHMS.find((a) => a.id === alg)!.tree;

  root.replaceChildren();
  root.classList.add('jug', 'sx');

  const sub = h('p', { class: 'jug-sub' });

  const toolbar = h('div', { class: 'jug-toolbar' });
  const algGroup = h('div', { class: 'jug-seg sx-algs', role: 'group', 'aria-label': 'Αλγόριθμος' });
  const algBtns = ALGORITHMS.map((a) => {
    const b = h('button', { type: 'button', 'aria-pressed': String(a.id === alg) }, a.label);
    b.addEventListener('click', () => setAlg(a.id));
    algGroup.append(b);
    return b;
  });
  const modeLabel = h('span', { class: 'jug-mode-label', id: `sx-mode-${Math.random().toString(36).slice(2, 8)}` }, 'Εκτέλεση:');
  const modeGroup = h('div', { class: 'jug-seg', role: 'group', 'aria-labelledby': modeLabel.id });
  const rowBtn = h('button', { type: 'button', 'aria-pressed': 'true' }, 'Ανά γραμμή');
  const cellBtn = h('button', { type: 'button', 'aria-pressed': 'false' }, 'Ανά κελί');
  modeGroup.append(rowBtn, cellBtn);
  const modeWrap = h('div', { class: 'jug-mode' });
  modeWrap.append(modeLabel, modeGroup);
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

  const treeTitle = h('h3', { class: 'jug-h' });
  const treeWrap = h('div', { class: 'jug-scroll jug-tree' });
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('role', 'img');
  treeWrap.append(svg);
  const legend = h('div', { class: 'jug-legend' });
  for (const [cls, text] of [['current', 'Τρέχουσα'], ['child', 'Παιδιά'], ['goal', 'Στόχος'], ['path', 'Ενεργή διαδρομή']]) {
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

  // Full screen, as in the water-jug demo.
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
  const label = (id: string) => (treeOf() === 'jug' ? jugNode(id).label : id);

  // ---- drawing ---------------------------------------------------------
  function ancestors(id: string | undefined) {
    const out = new Set<string>();
    const parent = (x: string) => (treeOf() === 'jug' ? jugNode(x).parent : stNode(x).parent);
    for (let p: string | null | undefined = id; p; p = parent(p)) out.add(p);
    return out;
  }

  function drawJug(current: Row | undefined, reached: Set<string>) {
    svg.setAttribute('viewBox', '0 0 800 590');
    const path = ancestors(current?.id);
    const kids = new Set(current?.childIds ?? []);
    for (const n of JUG_NODES.filter((n) => n.parent)) {
      const q = jugNode(n.parent!);
      const cls = path.has(n.id) && path.has(q.id) ? 'path' : kids.has(n.id) ? 'child' : '';
      s('line', { x1: q.x, y1: q.y + 24, x2: n.x, y2: n.y - 24, class: `jug-edge ${cls}` }, svg);
    }
    if (current?.limit !== undefined) {
      const y = 40 + current.limit * 85 + 50; // levels are 85 apart from y = 40
      s('line', { x1: 10, y1: y, x2: 790, y2: y, class: 'sx-limit' }, svg);
      s('text', { x: 786, y: y + 18, 'text-anchor': 'end', class: 'sx-limit-label' }, svg).textContent = `όριο βάθους ${current.limit}`;
    }
    for (const n of JUG_NODES) {
      const isCurrent = current?.id === n.id;
      const cls = isCurrent ? 'current' : n.id === 'k' && reached.has('k') ? 'goal' : kids.has(n.id) ? 'child' : '';
      const gEl = s('g', { class: `jug-node ${cls}` }, svg);
      s('rect', { x: n.x - 37, y: n.y - 23, width: 74, height: 47, rx: 6, class: 'box' }, gEl);
      [
        [n.big, 70, n.x - 29, n.y - 15, 25, 30],
        [n.small, 50, n.x + 3, n.y - 9, 21, 24],
      ].forEach(([v, cap, x, y, w, hh]) => {
        s('rect', { x: x!, y: y!, width: w!, height: hh!, class: 'glass' }, gEl);
        if (v) {
          const level = ((hh! - 2) * v!) / cap!;
          s('rect', { x: x! + 1, y: y! + hh! - level - 1, width: w! - 2, height: level, class: 'water' }, gEl);
        }
      });
      s('text', { x: n.x, y: n.y - 30, 'text-anchor': 'middle', class: 'name' }, gEl).textContent = n.label;
      s('text', { x: n.x, y: n.y + 40, 'text-anchor': 'middle', class: 'ml' }, gEl).textContent = `${n.big}/${n.small} ml`;
      if (isCurrent) s('circle', { cx: n.x + 38, cy: n.y - 23, r: 7, class: 'dot' }, gEl);
    }
  }

  function drawSt(current: Row | undefined, reached: Set<string>) {
    svg.setAttribute('viewBox', '0 0 800 590');
    // On a meeting, light up the whole solution S → … → T.
    const path = current?.kind === 'meet' ? ancestors(ST_GOAL) : alg === 'BiS' ? new Set<string>() : ancestors(current?.id);
    const kids = new Set(current?.childIds ?? []);
    for (const n of ST_NODES.filter((n) => n.parent)) {
      const q = stNode(n.parent!);
      const cls = path.has(n.id) && path.has(q.id) ? 'path' : kids.has(n.id) && (q.id === current?.id || n.id === current?.id) ? 'child' : '';
      s('line', { x1: q.x, y1: q.y + 25, x2: n.x, y2: n.y - 25, class: `jug-edge ${cls}` }, svg);
      s('text', { x: (q.x + n.x) / 2 + (n.x < q.x ? -10 : 10), y: (q.y + n.y) / 2, 'text-anchor': 'middle', class: 'sx-cost' }, svg).textContent = String(n.cost);
    }
    for (const n of ST_NODES) {
      const isCurrent = current?.id === n.id;
      const pruned = isCurrent && current?.kind === 'pruned';
      const cls = pruned ? 'pruned' : isCurrent ? 'current' : n.id === ST_GOAL && reached.has(ST_GOAL) ? 'goal' : kids.has(n.id) ? 'child' : '';
      const gEl = s('g', { class: `jug-node sx-node ${cls}` }, svg);
      s('circle', { cx: n.x, cy: n.y, r: 24, class: 'box' }, gEl);
      s('text', { x: n.x, y: n.y + 6, 'text-anchor': 'middle', class: 'name' }, gEl).textContent = n.id;
      s('text', { x: n.x, y: n.y + 42, 'text-anchor': 'middle', class: 'ml' }, gEl).textContent =
        alg === 'BEAM' ? `h=${n.h}` : alg === 'BB' ? `g=${g(n.id)}` : `h=${n.h} · g=${g(n.id)}`;
      if (isCurrent) s('circle', { cx: n.x + 22, cy: n.y - 22, r: 7, class: 'dot' }, gEl);
    }
  }

  // ---- text ------------------------------------------------------------
  function explain(r: Row | undefined, i: number): string {
    if (!r) {
      return treeOf() === 'jug'
        ? 'Ξεκινάμε από την κατάσταση Α (0, 0). Το κλειστό σύνολο είναι κενό.'
        : 'Ξεκινάμε από την S· στόχος είναι η T. Οι αριθμοί στις ακμές είναι κόστη βήματος.';
    }
    const L = label(r.id);
    const newRound = alg === 'ID' && (i === 0 || rows[i - 1]!.limit !== r.limit) ? `Νέος γύρος με όριο βάθους ${r.limit}: ξεκινάμε από την αρχή, με κενό κλειστό σύνολο. ` : '';
    switch (r.kind) {
      case 'loop':
        return `${newRound}Βρόχος: η κατάσταση ${L} έχει ήδη εξεταστεί, άρα δεν επεκτείνεται.`;
      case 'cut':
        return `${newRound}Η ${L} είναι στο όριο βάθους ${r.limit}: εξετάζεται, αλλά δεν επεκτείνεται.`;
      case 'goal':
        if (alg === 'BB') return `Λύση με κόστος ${r.cost}: νέο όριο ${r.cost}. Ο B&B συνεχίζει, μήπως υπάρχει φθηνότερη.`;
        return treeOf() === 'jug'
          ? `${newRound}ΤΕΛΙΚΗ: η κατάσταση Κ έχει 40 ml στο μεγάλο ποτήρι και 50 ml στο μικρό.`
          : `Βρέθηκε ο στόχος T, με κόστος διαδρομής ${g(ST_GOAL)}.`;
      case 'pruned':
        return `g(${L}) = ${r.cost}, όχι μικρότερο από το όριο ${bound(r.bound)}: κλάδεμα, δεν επεκτείνεται.`;
      case 'leaf':
        return alg === 'BB'
          ? `g(${L}) = ${r.cost} < ${bound(r.bound)}, αλλά η ${L} δεν έχει παιδιά.`
          : `${newRound}Η ${L} δεν έχει παιδιά.`;
      case 'meet':
        return `Η ${r.childIds[0]} έχει ήδη βρεθεί από την άλλη αναζήτηση: οι δύο συναντήθηκαν. Λύση S → A → D → H → T.`;
      default: {
        const kids = fmt(r.children);
        if (alg === 'ID') return `${newRound}Επεκτείνουμε την ${L}· τα παιδιά ${kids} μπαίνουν στην αρχή του μετώπου.`;
        if (alg === 'BB') return `g(${L}) = ${r.cost} < ${bound(r.bound)}: επεκτείνουμε. Τα παιδιά ${kids} μπαίνουν στην αρχή (σαν DFS).`;
        if (alg === 'BEAM') return `h(${L}) = ${stNode(r.id).h}. Παιδιά ${kids}· ταξινομούμε το μέτωπο κατά h και κρατάμε τις 2 καλύτερες.`;
        if (alg === 'BiS') return `Βήμα ${r.side === 'forward' ? 'από την αρχή S' : 'από τον στόχο T'}: επεκτείνουμε την ${L}, νέες καταστάσεις ${kids}.`;
        const n = jugNode(r.id);
        return `Εξετάζουμε την κατάσταση ${L} (${n.big}, ${n.small} ml). Παιδιά: ${kids}. Στον ${alg} προστίθενται ${alg === 'DFS' ? 'στην αρχή' : 'στο τέλος'} του μετώπου.`;
      }
    }
  }

  function lastCell(r: Row): string {
    if (r.kind === 'goal') return 'ΤΕΛΙΚΗ';
    if (r.kind === 'loop') return '— (βρόχος)';
    if (r.kind === 'cut') return '— (όριο βάθους)';
    if (r.kind === 'pruned') return '— (κλάδεμα)';
    if (r.kind === 'meet') return `${fmt(r.children)} · συνάντηση`;
    return fmt(r.children);
  }

  function extraCell(r: Row): string {
    if (alg === 'ID') return String(r.limit);
    if (alg === 'BB') return `${r.cost} / ${bound(r.bound)}`;
    if (alg === 'BiS') return r.side === 'forward' ? 'S →' : '← T';
    if (alg === 'BEAM') return String(stNode(r.id).h);
    return '';
  }

  function renderMetrics(current: Row | undefined) {
    const cards: [string, string][] =
      treeOf() === 'jug'
        ? [
            [alg === 'ID' ? 'Όριο βάθους' : 'Τρέχουσα κατάσταση', alg === 'ID' ? String(current?.limit ?? 1) : current ? label(current.id) : 'Α'],
            ['Ποτήρι 70 ml', `${current ? jugNode(current.id).big : 0} ml`],
            ['Ποτήρι 50 ml', `${current ? jugNode(current.id).small : 0} ml`],
          ]
        : [
            [alg === 'BiS' ? 'Κατεύθυνση' : 'Τρέχων κόμβος', alg === 'BiS' ? (current ? (current.side === 'forward' ? 'από την S' : 'από την T') : 'και από τις δύο') : current?.id ?? 'S'],
            [alg === 'BB' ? 'Καλύτερο κόστος (όριο)' : 'Κόστος g', alg === 'BB' ? bound(current?.kind === 'goal' ? current.cost : current?.bound) : String(current ? g(current.id) : 0)],
            ['Ευριστική h', String(current ? stNode(current.id).h : stNode('S').h)],
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
    const per = perRow();
    const max = maxStep();
    const active = step ? Math.floor((step - 1) / per) : -1;
    const current = rows[active];
    const done = mode === 'cell' ? Math.floor(step / CELLS) : step;
    const reached = new Set(rows.slice(0, active + 1).filter((r) => r.kind === 'goal' || r.kind === 'meet').map((r) => r.id));
    if (rows.slice(0, active + 1).some((r) => r.kind === 'meet')) reached.add(ST_GOAL);

    sub.textContent =
      treeOf() === 'jug'
        ? `${ABOUT[alg]} Δύο ποτήρια 70 ml και 50 ml · στόχος 40 ml.`
        : `${ABOUT[alg]}`;
    treeTitle.textContent = treeOf() === 'jug' ? 'Δέντρο των ποτηριών (διαφάνεια 19)' : 'Δέντρο με κόστη και ευριστική (δικό μας παράδειγμα)';
    stepLabel.textContent = `Βήμα ${done} / ${rows.length}`;
    fill.style.width = `${max ? (step / max) * 100 : 0}%`;
    bar.setAttribute('aria-valuemax', String(max));
    bar.setAttribute('aria-valuenow', String(step));
    status.textContent = !current
      ? 'Αρχική κατάσταση'
      : current.kind === 'meet'
        ? 'Συνάντηση'
        : current.kind === 'goal'
          ? 'Βρέθηκε λύση'
          : `Κατάσταση ${label(current.id)}`;
    resetBtn.disabled = prevBtn.disabled = step === 0;
    nextBtn.disabled = endBtn.disabled = step === max;

    svg.replaceChildren();
    if (treeOf() === 'jug') drawJug(current, reached);
    else drawSt(current, reached);
    svg.setAttribute('aria-label', current ? `Δέντρο αναζήτησης. Τρέχουσα κατάσταση ${label(current.id)}.` : 'Δέντρο αναζήτησης.');

    renderMetrics(current);
    explanation.textContent = explain(current, active) + (step === max && max ? (alg === 'BB' ? ' Τέλος: το μέτωπο άδειασε. Βέλτιστη λύση S → A → D → H → T με κόστος 8.' : '') : '');

    const extra = EXTRA[alg];
    thead.replaceChildren();
    const trh = h('tr');
    for (const t of ['#', 'Μέτωπο αναζήτησης', 'Κλειστό σύνολο', 'Κατάσταση', 'Παιδιά', ...(extra ? [extra] : [])]) trh.append(h('th', { scope: 'col' }, t));
    thead.append(trh);
    tbody.replaceChildren();
    rows.forEach((r, i) => {
      const tr = h('tr');
      if (i === active) tr.classList.add('current');
      if ((r.kind === 'goal' || r.kind === 'meet') && i <= active) tr.classList.add('goal');
      const values = [fmt(r.frontier), set(r.closed), label(r.id), lastCell(r)];
      tr.append(h('td', {}, String(i + 1)));
      values.forEach((v, j) => {
        const shown = mode === 'row' ? i < step : i * CELLS + REVEAL.indexOf(j) < step;
        tr.append(h('td', shown ? {} : { class: 'hidden-cell' }, shown ? v : '—'));
      });
      if (extra) {
        const shown = mode === 'row' ? i < step : i * CELLS + 2 < step;
        tr.append(h('td', shown ? {} : { class: 'hidden-cell' }, shown ? extraCell(r) : '—'));
      }
      tbody.append(tr);
    });
    const row = tbody.children[active] as HTMLElement | undefined;
    if (row) tableWrap.scrollTop = Math.max(0, row.offsetTop - tableWrap.clientHeight / 2);

    foot.textContent =
      treeOf() === 'jug'
        ? 'Το δέντρο των ποτηριών είναι αυτό της διάλεξης. Η εκτέλεση του DFS είναι ο πίνακας της διαφάνειας 21· ο BFS και η ID εφαρμόζονται με τους αλγορίθμους της διάλεξης στο ίδιο δέντρο. «Βρόχος» = η κατάσταση έχει ήδη εξεταστεί (είναι στο κλειστό σύνολο).'
        : 'Το δέντρο S…T, τα κόστη βήματος και οι τιμές h είναι δικό μας εκπαιδευτικό παράδειγμα, όχι δεδομένα της διάλεξης. g = συνολικό κόστος από την S, h = εκτίμηση της απόστασης από την T. Η Beam Search εξετάζεται αναλυτικά στην Εβδομάδα 3.';
  }

  function setAlg(next: AlgorithmId) {
    alg = next;
    step = 0;
    rows = run(alg);
    ALGORITHMS.forEach((a, i) => algBtns[i]!.setAttribute('aria-pressed', String(a.id === alg)));
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
  nextBtn.addEventListener('click', () => { step = Math.min(maxStep(), step + 1); render(); });
  prevBtn.addEventListener('click', () => { step = Math.max(0, step - 1); render(); });
  resetBtn.addEventListener('click', () => { step = 0; render(); });
  endBtn.addEventListener('click', () => { step = maxStep(); render(); });

  render();
}
