/**
 * Interactive explorer of Minimax and Alpha-Beta (CN6005 Week 4). Mounted
 * into <div data-demo="game-tree"> by src/scripts/demos.ts. The traces come
 * from src/lib/game-tree.ts (tested); this file only draws them.
 *
 * It shares the look of the Week 2–3 explorers (water-jug.css,
 * search-explorer.css) but not their Μέτωπο/Κλειστό table: a game tree is
 * searched depth-first with α and β, so the table has step, active node,
 * player, leaf, value, α, β and the pruning decision. «Πρόβλεψη» asks, before
 * a step, which value a node returns or whether the rest is pruned.
 *
 * Optional presets: data-tree="lecture" data-algorithm="AB".
 */
import './water-jug.css';
import './search-explorer.css';
import './game-tree.css';
import { leafCount, prunedLeaves, question, run, tree, TREES, type Alg, type Row, type TreeId } from '~/lib/game-tree';

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

const fmt = (x: number | null | undefined) => (x === null || x === undefined ? '—' : x === Infinity ? '+∞' : x === -Infinity ? '−∞' : String(x).replace('-', '−'));

const NOTE: Record<TreeId, string> = {
  abc: 'Το παράδειγμα των σημειώσεων: ο MAX διαλέγει ανάμεσα σε A, B και C.',
  order: 'Το ίδιο δέντρο με τον C πρώτο και τα φύλλα του A με σειρά 4, 6, 8. Η τιμή δεν αλλάζει· αλλάζει πόσα φύλλα εξετάζονται.',
  lecture: 'Το δέντρο της διάλεξης (διαφάνειες 13–14 και 24–26). Με Alpha-Beta αναπαράγει τα βήματα (a)–(f) των διαφανειών 24–25.',
  lecture2: 'Το δεύτερο παράδειγμα Alpha-Beta της διάλεξης (διαφάνεια 20). Τα ονόματα B–E των κόμβων MIN είναι δικά μας.',
};

export function mount(root: HTMLElement): void {
  const isTree = (x: string | undefined): x is TreeId => TREES.some((t) => t.id === x);
  let tid: TreeId = isTree(root.dataset.tree) ? root.dataset.tree : 'abc';
  let alg: Alg = root.dataset.algorithm === 'AB' ? 'AB' : 'MINIMAX';
  let mode: 'step' | 'predict' = 'step';
  let step = 0;
  let rows: Row[] = run(tid, alg);
  let feedback: { ok: boolean; text: string } | undefined;
  const T = () => tree(tid);
  const L = (id: string) => T().nodes[id]!.label;
  const who = (id: string) => (T().nodes[id]!.max ? 'MAX' : 'MIN');
  const name = (id: string) => (id === T().root ? `η ρίζα ${L(id)}` : `ο ${L(id)}`);

  root.replaceChildren();
  root.classList.add('jug', 'sx', 'gt');

  const sub = h('p', { class: 'jug-sub' });
  const toolbar = h('div', { class: 'jug-toolbar' });
  const treeGroup = h('div', { class: 'jug-seg sx-algs', role: 'group', 'aria-label': 'Δέντρο' });
  const treeBtns = TREES.map((t) => {
    const b = h('button', { type: 'button' }, t.label);
    b.addEventListener('click', () => { tid = t.id; reset(); });
    treeGroup.append(b);
    return b;
  });
  const algGroup = h('div', { class: 'jug-seg sx-algs', role: 'group', 'aria-label': 'Αλγόριθμος' });
  const algBtns = (['MINIMAX', 'AB'] as Alg[]).map((a) => {
    const b = h('button', { type: 'button' }, a === 'AB' ? 'Alpha-Beta' : 'Minimax');
    b.addEventListener('click', () => { alg = a; reset(); });
    algGroup.append(b);
    return b;
  });
  const modeLabel = h('span', { class: 'jug-mode-label', id: `gt-mode-${Math.random().toString(36).slice(2, 8)}` }, 'Εκτέλεση:');
  const modeGroup = h('div', { class: 'jug-seg sx-algs', role: 'group', 'aria-labelledby': modeLabel.id });
  const stepBtn = h('button', { type: 'button' }, 'Ανά βήμα');
  const predictBtn = h('button', { type: 'button' }, 'Πρόβλεψη');
  modeGroup.append(stepBtn, predictBtn);
  const modeWrap = h('div', { class: 'jug-mode' });
  modeWrap.append(modeLabel, modeGroup);
  toolbar.append(treeGroup, algGroup, modeWrap);

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
  const quiz = h('div', { class: 'gt-quiz', 'aria-live': 'polite' });
  panel.append(head, bar, controls, quiz);

  const treeTitle = h('h3', { class: 'jug-h' }, 'Δέντρο παιχνιδιού');
  const treeWrap = h('div', { class: 'jug-scroll jug-tree' });
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('role', 'img');
  treeWrap.append(svg);
  const legend = h('div', { class: 'jug-legend' });
  for (const [cls, text] of [['gt-sw-active', 'Ενεργός κόμβος'], ['gt-sw-leaf', 'Αξιολογημένο φύλλο'], ['gt-sw-pruned', 'Κλαδεμένο'], ['gt-sw-best', 'Απόφαση']]) {
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

  // ---- drawing ------------------------------------------------------------
  function draw() {
    const t = T();
    const shown = rows.slice(0, step);
    const cur = shown.at(-1);
    const done = step === rows.length;
    const pruned = prunedLeaves(tid, rows, step);
    const evaluated = new Set(shown.filter((r) => r.kind === 'child' && t.nodes[r.child!]!.value !== undefined).map((r) => r.child!));
    const mins = t.nodes[t.root]!.children;
    const leaves = mins.flatMap((m) => t.nodes[m]!.children);
    const W = 80 + leaves.length * 64;
    svg.setAttribute('viewBox', `0 0 ${W} 380`);
    const lx = new Map(leaves.map((l, i) => [l, 70 + i * 64]));
    const mx = new Map(mins.map((m) => {
      const ks = t.nodes[m]!.children.map((c) => lx.get(c)!);
      return [m, (ks[0]! + ks.at(-1)!) / 2];
    }));
    const R = { x: W / 2, y: 60 }, MY = 190, LY = 320;
    const bestRoot = done ? rows.find((r) => r.kind === 'child' && r.node === t.root && r.childValue === rows.at(-1)!.value)!.child : undefined;
    const bestLeaf = (m: string) => {
      const ret = shown.find((r) => r.kind === 'return' && r.node === m);
      return ret ? shown.find((r) => r.kind === 'child' && r.node === m && r.childValue === ret.value)?.child : undefined;
    };
    s('text', { x: 18, y: R.y + 6, class: 'gt-ply' }, svg).textContent = 'MAX';
    s('text', { x: 18, y: MY + 6, class: 'gt-ply' }, svg).textContent = 'MIN';

    // edges
    for (const m of mins) {
      const active = cur && ((cur.node === t.root && cur.child === m) || (cur.node === m && cur.kind === 'enter'));
      s('line', { x1: R.x, y1: R.y + 22, x2: mx.get(m)!, y2: MY - 24, class: `gt-edge ${m === bestRoot ? 'best' : active ? 'active' : ''}` }, svg);
      for (const l of t.nodes[m]!.children) {
        const cls = pruned.has(l) ? 'pruned' : (done && m === bestRoot && l === bestLeaf(m)) ? 'best' : cur?.node === m && cur.child === l ? 'active' : '';
        s('line', { x1: mx.get(m)!, y1: MY + 24, x2: lx.get(l)!, y2: LY - 20, class: `gt-edge ${cls}` }, svg);
      }
    }
    // internal nodes: value so far (≥ / ≤) or final, and [α, β]
    const label = (id: string) => {
      const ret = shown.find((r) => r.kind === 'return' && r.node === id);
      if (ret) return fmt(ret.value);
      const last = [...shown].reverse().find((r) => r.node === id && r.kind !== 'enter');
      if (!last) return '';
      return `${t.nodes[id]!.max ? '≥' : '≤'}${fmt(last.value)}`;
    };
    const interval = (id: string) => {
      if (alg !== 'AB') return '';
      const last = [...shown].reverse().find((r) => r.node === id);
      return last ? `[${fmt(last.alpha)}, ${fmt(last.beta)}]` : '';
    };
    const node = (id: string, x: number, y: number, up: boolean) => {
      const active = cur?.node === id;
      const g = s('g', { class: `gt-node ${active ? 'active' : ''} ${id === bestRoot || (done && id === t.root) ? 'best' : ''}` }, svg);
      const pts = up ? `${x},${y - 28} ${x - 34},${y + 22} ${x + 34},${y + 22}` : `${x - 34},${y - 24} ${x + 34},${y - 24} ${x},${y + 26}`;
      s('polygon', { points: pts, class: 'box' }, g);
      s('text', { x, y: up ? y + 14 : y - 4, 'text-anchor': 'middle', class: 'val' }, g).textContent = label(id);
      s('text', { x: x + 40, y: y - 14, class: 'name' }, g).textContent = L(id);
      const iv = interval(id);
      if (iv) s('text', { x: x + 40, y: y + 6, class: 'iv' }, g).textContent = iv;
    };
    node(t.root, R.x, R.y, true);
    for (const m of mins) node(m, mx.get(m)!, MY, false);
    for (const l of leaves) {
      const x = lx.get(l)!;
      const cls = pruned.has(l) ? 'pruned' : evaluated.has(l) ? 'leaf-done' : '';
      const g = s('g', { class: `gt-leaf ${cls} ${cur?.child === l ? 'active' : ''}` }, svg);
      s('rect', { x: x - 22, y: LY - 20, width: 44, height: 40, rx: 6, class: 'box' }, g);
      s('text', { x, y: LY + 7, 'text-anchor': 'middle', class: 'val' }, g).textContent = fmt(t.nodes[l]!.value);
    }
    svg.setAttribute('aria-label', cur ? `Βήμα ${step}: ${explain(cur)}` : 'Αρχή: κανένα φύλλο δεν έχει αξιολογηθεί.');
  }

  // ---- text ---------------------------------------------------------------
  function explain(r: Row | undefined): string {
    const t = T();
    if (!r) return `Η αναζήτηση ξεκινά από τη ρίζα ${L(t.root)} (MAX) και πηγαίνει σε βάθος, από αριστερά προς τα δεξιά.${alg === 'AB' ? ' Αρχικά α = −∞ και β = +∞.' : ''}`;
    const ab = alg === 'AB';
    switch (r.kind) {
      case 'enter':
        return `${name(r.node)[0]!.toUpperCase()}${name(r.node).slice(1)} (${who(r.node)}) αρχίζει να εξετάζει τα παιδιά ${r.node === t.root ? 'της' : 'του'}${ab ? `, με α = ${fmt(r.alpha)} και β = ${fmt(r.beta)}` : ''}.`;
      case 'child': {
        const c = t.nodes[r.child!]!;
        const got = c.value !== undefined ? `Αξιολογείται το φύλλο ${fmt(r.childValue)}.` : `Ο ${c.label} επιστρέφει ${fmt(r.childValue)}.`;
        const keep = t.nodes[r.node]!.max ? `Ο MAX κρατά τη μεγαλύτερη τιμή ως τώρα: ${fmt(r.value)}${ab ? `, άρα α = ${fmt(r.alpha)}` : ''}.` : `Ο MIN κρατά τη μικρότερη τιμή ως τώρα: ${fmt(r.value)}${ab ? `, άρα β = ${fmt(r.beta)}` : ''}.`;
        return `${got} ${keep}`;
      }
      case 'prune': {
        const names = r.pruned!.map(L).join(', ');
        return t.nodes[r.node]!.max
          ? `α = ${fmt(r.alpha)} ≥ β = ${fmt(r.beta)}: ο MIN έχει ήδη καλύτερη επιλογή αλλού, άρα τα ${names} δεν αλλάζουν την απόφαση. Κλάδεμα.`
          : `α = ${fmt(r.alpha)} ≥ β = ${fmt(r.beta)}: ο MAX έχει ήδη εξασφαλίσει ${fmt(r.alpha)}, ενώ εδώ ο MIN μπορεί να κρατήσει ${fmt(r.beta)} ή λιγότερο. Ό,τι κι αν είναι τα ${names}, ο MAX δεν θα διαλέξει τον ${L(r.node)}. Κλάδεμα: δεν εξετάζονται.`;
      }
      case 'return':
        if (r.node === t.root) {
          const best = rows.find((x) => x.kind === 'child' && x.node === t.root && x.childValue === r.value)!.child!;
          return `Η ρίζα παίρνει ${fmt(r.value)}: ο MAX παίζει ${L(best)}. Αξιολογήθηκαν ${r.leaves} από ${leafCount(t)} φύλλα.`;
        }
        return `Ο ${L(r.node)} (${who(r.node)}) τελείωσε: επιστρέφει ${fmt(r.value)} στη ρίζα.`;
    }
  }

  function decision(r: Row): string {
    const t = T();
    if (r.kind === 'enter') return 'αρχή';
    if (r.kind === 'prune') return `α ≥ β: κλάδεμα ${r.pruned!.map(L).join(', ')}`;
    if (r.kind === 'return') return r.node === t.root ? 'τιμή ρίζας' : 'επιστροφή στη ρίζα';
    const n = t.nodes[r.node]!;
    const last = n.children.at(-1) === r.child;
    if (alg !== 'AB') return last ? 'τελευταίο παιδί' : 'συνέχεια';
    if (last) return 'τελευταίο παιδί';
    return r.alpha! >= r.beta! ? 'α ≥ β' : 'α < β: συνέχεια';
  }

  function renderMetrics() {
    const cur = rows[step - 1];
    const cards: [string, string][] = [['Φύλλα', `${cur?.leaves ?? 0} / ${leafCount(T())}`]];
    if (alg === 'AB') cards.push(['α', fmt(cur ? cur.alpha : -Infinity)], ['β', fmt(cur ? cur.beta : Infinity)]);
    else cards.push(['Ενεργός κόμβος', cur ? L(cur.node) : L(T().root)], ['Τιμή ρίζας', step === rows.length ? fmt(rows.at(-1)!.value) : '?']);
    metrics.replaceChildren(...cards.map(([k, v]) => {
      const c = h('div', { class: 'sx-metric' });
      c.append(h('span', {}, k), h('strong', {}, v));
      return c;
    }));
  }

  function renderQuiz() {
    quiz.replaceChildren();
    if (mode !== 'predict') return;
    if (feedback) quiz.append(h('p', { class: `gt-feedback ${feedback.ok ? 'ok' : 'bad'}` }, feedback.text));
    const q = question(tid, rows, step, alg);
    if (!q) {
      if (step < rows.length) quiz.append(h('p', { class: 'jug-sub' }, 'Εδώ δεν υπάρχει επιλογή· πάτα «Επόμενο».'));
      return;
    }
    quiz.append(h('p', { class: 'gt-quiz-q' }, q.text));
    const opts = h('div', { class: 'gt-quiz-opts' });
    for (const o of q.options) {
      const b = h('button', { type: 'button' }, o.replace('-', '−'));
      b.addEventListener('click', () => {
        const ok = o === q.answer;
        const why = explain(rows[step]);
        feedback = { ok, text: `${ok ? 'Σωστά.' : `Όχι: η σωστή απάντηση είναι «${q.answer.replace('-', '−')}».`} ${why}` };
        step += 1;
        render(false);
      });
      opts.append(b);
    }
    quiz.append(opts);
  }

  function render(clearFeedback = true) {
    if (clearFeedback) feedback = undefined;
    const max = rows.length;
    const cur = rows[step - 1];
    sub.textContent = alg === 'AB'
      ? 'Alpha-Beta: ίδια τιμή με τον Minimax, αλλά σταματά να εξετάζει τα παιδιά ενός κόμβου μόλις α ≥ β.'
      : 'Minimax: οι τιμές ανεβαίνουν από τα φύλλα. Ο MIN κρατά τη μικρότερη, ο MAX τη μεγαλύτερη.';
    stepLabel.textContent = `Βήμα ${step} / ${max}`;
    fill.style.width = `${(step / max) * 100}%`;
    bar.setAttribute('aria-valuemax', String(max));
    bar.setAttribute('aria-valuenow', String(step));
    status.textContent = !cur ? 'Αρχή' : cur.kind === 'prune' ? 'Κλάδεμα' : step === max ? `Απόφαση: ${fmt(cur.value)}` : `Κόμβος ${L(cur.node)}`;
    resetBtn.disabled = prevBtn.disabled = step === 0;
    nextBtn.disabled = endBtn.disabled = step === max;
    TREES.forEach((t, i) => treeBtns[i]!.setAttribute('aria-pressed', String(t.id === tid)));
    algBtns.forEach((b, i) => b.setAttribute('aria-pressed', String((i === 1) === (alg === 'AB'))));
    stepBtn.setAttribute('aria-pressed', String(mode === 'step'));
    predictBtn.setAttribute('aria-pressed', String(mode === 'predict'));

    svg.replaceChildren();
    draw();
    renderMetrics();
    explanation.textContent = explain(cur);
    renderQuiz();

    thead.replaceChildren();
    const trh = h('tr');
    for (const c of ['#', 'Ενεργός κόμβος', 'Παίκτης', 'Φύλλο', 'Τιμή', 'α', 'β', 'Απόφαση']) trh.append(h('th', { scope: 'col' }, c));
    thead.append(trh);
    tbody.replaceChildren();
    rows.forEach((r, i) => {
      const tr = h('tr');
      if (i === step - 1) tr.classList.add('current');
      if (r.kind === 'prune' && i < step) tr.classList.add('gt-pruned-row');
      const leaf = r.kind === 'child' && T().nodes[r.child!]!.value !== undefined ? fmt(r.childValue) : '—';
      const cells = [String(i + 1), L(r.node), who(r.node), leaf, r.kind === 'enter' ? '—' : fmt(r.value), fmt(r.alpha), fmt(r.beta), decision(r)];
      cells.forEach((v, j) => {
        const shown = j === 0 || i < step;
        tr.append(h('td', shown ? {} : { class: 'hidden-cell' }, shown ? v : '—'));
      });
      tbody.append(tr);
    });
    const row = tbody.children[step - 1] as HTMLElement | undefined;
    if (row) tableWrap.scrollTop = Math.max(0, row.offsetTop - tableWrap.clientHeight / 2);
    foot.textContent = `${NOTE[tid]} ▲ κόμβος MAX, ▼ κόμβος MIN, τετράγωνα: φύλλα με την τιμή της συνάρτησης αξιολόγησης.${alg === 'AB' ? ' Δίπλα σε κάθε κόμβο το διάστημα [α, β].' : ''}`;
  }

  function reset() {
    step = 0;
    rows = run(tid, alg);
    render();
  }

  stepBtn.addEventListener('click', () => { mode = 'step'; reset(); });
  predictBtn.addEventListener('click', () => { mode = 'predict'; reset(); });
  nextBtn.addEventListener('click', () => { step = Math.min(rows.length, step + 1); render(); });
  prevBtn.addEventListener('click', () => { step = Math.max(0, step - 1); render(); });
  resetBtn.addEventListener('click', () => { step = 0; render(); });
  endBtn.addEventListener('click', () => { step = rows.length; render(); });

  reset();
}
