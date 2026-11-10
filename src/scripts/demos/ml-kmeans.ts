/**
 * K-Means Stepper (CN6005 Week 5, priority 3): twelve customers (orders per
 * year, average order value), k = 2 or 3, three starting choices, and the two
 * alternating steps «Ανάθεση» and «Ενημέρωση κέντρων», with a history.
 * Distances use min-max-scaled features. Logic: src/lib/ml-lab.ts (tested).
 *
 * k stops at 3: no fourth categorical colour passes the colour-vision checks
 * against the other three on a scatter (dataviz validator, both themes), and
 * every group also has its own shape.
 */
import { CUSTOMERS, INITS, kAssign, kInit, kUpdate, wcss, type KState } from '~/lib/ml-lab';
import { button, card, h, num, predictBox, s, table } from './ml-ui';

const W = 560, H = 370, L = 56, R = 20, T = 34, B = 50;
const px = (x: number) => L + (x / 10) * (W - L - R);
const py = (y: number) => T + (1 - y / 120) * (H - T - B);
const COLOR = ['var(--ml-c1)', 'var(--ml-c2)', 'var(--ml-c3)'];
const SHAPE = ['κύκλος', 'τετράγωνο', 'τρίγωνο'];

function mark(g: Element, shape: number, x: number, y: number, r: number, fill: string) {
  const common = { fill, stroke: 'var(--panel-solid)', 'stroke-width': 2 };
  if (shape === 0) s('circle', { cx: x, cy: y, r, ...common }, g);
  else if (shape === 1) s('rect', { x: x - r * 0.9, y: y - r * 0.9, width: r * 1.8, height: r * 1.8, rx: 2, ...common }, g);
  else s('polygon', { points: `${x},${y - r * 1.1} ${x - r},${y + r * 0.8} ${x + r},${y + r * 0.8}`, ...common }, g);
}

export function mount(root: HTMLElement): void {
  let k = 3, init = 0;
  let st: KState;
  let phase: 'assign' | 'update' | 'done';
  let round = 0;
  let history: string[] = [];
  card(root, 'K-Means Stepper', 'Δώδεκα πελάτες ενός e-shop: παραγγελίες τον χρόνο και μέση αξία παραγγελίας (δικά μας, ενδεικτικά). Διάλεξε πόσες ομάδες (k) και από πού ξεκινούν τα κέντρα, και προχώρα βήμα-βήμα.');

  const kGroup = h('div', { class: 'ml-row', role: 'group', 'aria-label': 'Αριθμός ομάδων k' });
  const kBtns = [2, 3].map((v) => button(`k = ${v}`, () => { k = v; reset(); }));
  kGroup.append(h('span', {}, 'Ομάδες:'), ...kBtns);
  const iGroup = h('div', { class: 'ml-row', role: 'group', 'aria-label': 'Αρχικά κέντρα' });
  const iBtns = INITS.map((it, i) => button(`Αρχή ${it.label}`, () => { init = i; reset(); }));
  iGroup.append(h('span', {}, 'Αρχικά κέντρα:'), ...iBtns);
  const ask = h('div');
  const actions = h('div', { class: 'ml-row' });
  const chart = h('div', { class: 'ml-chart' });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('role', 'img');
  chart.append(svg);
  const legend = h('p', { class: 'ml-lead' });
  const stats = h('div', { class: 'ml-stats' });
  const why = h('p', { class: 'ml-note', 'aria-live': 'polite' });
  const hist = h('ol', { class: 'ml-history' });
  const tableWrap = h('div');
  root.append(kGroup, iGroup, ask, actions, chart, legend, stats, why, h('p', { class: 'ml-q' }, 'Ιστορικό'), hist, tableWrap);

  function reset() {
    st = kInit(CUSTOMERS, k, init);
    phase = 'assign';
    round = 0;
    history = [`Αρχή ${INITS[init]!.label}: τα ${k} κέντρα ξεκινούν από τους πελάτες ${INITS[init]!.order.slice(0, k).map((i) => CUSTOMERS[i]!.id).join(', ')}.`];
    why.textContent = 'Πρώτο βήμα: κάθε πελάτης πηγαίνει στο κοντινότερο κέντρο.';
    render();
  }

  function doAssign() {
    const a = kAssign(CUSTOMERS, st);
    st = a.state;
    round++;
    if (round > 1 && a.changed === 0) {
      phase = 'done';
      history.push(`Ανάθεση ${round}: κανένας πελάτης δεν άλλαξε ομάδα → σύγκλιση.`);
      why.textContent = 'Κανένα σημείο δεν άλλαξε ομάδα, άρα και τα κέντρα δεν θα μετακινηθούν: ο αλγόριθμος συγκλίνει. Τι σημαίνει κάθε ομάδα («συχνοί αγοραστές μικρών ποσών»;) το ερμηνεύει ένας άνθρωπος.';
    } else {
      phase = 'update';
      history.push(`Ανάθεση ${round}: ${a.changed} ${a.changed === 1 ? 'πελάτης πήρε' : 'πελάτες πήραν'} νέα ομάδα.`);
      why.textContent = 'Κάθε πελάτης πήγε στο κοντινότερο κέντρο (απόσταση στα κανονικοποιημένα χαρακτηριστικά). Επόμενο: κάθε κέντρο μετακινείται στον μέσο όρο της ομάδας του.';
    }
    render();
  }

  function doUpdate() {
    const u = kUpdate(CUSTOMERS, st);
    st = u.state;
    phase = 'assign';
    history.push(`Ενημέρωση ${round}: ${u.moved} ${u.moved === 1 ? 'κέντρο μετακινήθηκε' : 'κέντρα μετακινήθηκαν'} στον μέσο όρο της ομάδας τους.`);
    why.textContent = 'Κάθε κέντρο (✕) πήγε στο μέσο των σημείων της ομάδας του. Τώρα κάποιοι πελάτες μπορεί να είναι πιο κοντά σε άλλο κέντρο.';
    render();
  }

  function render() {
    kBtns.forEach((b, i) => b.setAttribute('aria-pressed', String([2, 3][i] === k)));
    iBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === init)));
    ask.replaceChildren();
    actions.replaceChildren();
    if (phase === 'assign' && round >= 1) {
      const next = kAssign(CUSTOMERS, st).changed;
      ask.append(predictBox('θα αλλάξει ομάδα κάποιος πελάτης στην επόμενη ανάθεση;', ['Ναι', 'Όχι'], next ? 'Ναι' : 'Όχι',
        next ? `Ναι: ${next} ${next === 1 ? 'πελάτης είναι' : 'πελάτες είναι'} τώρα πιο κοντά σε άλλο κέντρο.` : 'Όχι: τα κέντρα έφτασαν στη θέση τους.', () => doAssign()));
    }
    if (phase === 'assign') actions.append(button(round ? 'Ανάθεση χωρίς πρόβλεψη' : 'Ανάθεση', doAssign, round ? '' : 'primary'));
    if (phase === 'update') actions.append(button('Ενημέρωση κέντρων', doUpdate, 'primary'));
    actions.append(button('Μέχρι τη σύγκλιση', () => {
      for (let g = 0; g < 50 && phase !== 'done'; g++) (phase === 'assign' ? doAssign : doUpdate)();
    }), button('↺ Επανεκκίνηση', reset));

    svg.replaceChildren();
    for (let y = 0; y <= 120; y += 20) {
      s('line', { x1: L, x2: W - R, y1: py(y), y2: py(y), class: 'ml-grid' }, svg);
      s('text', { x: L - 8, y: py(y) + 4, 'text-anchor': 'end', class: 'ml-tick' }, svg).textContent = String(y);
    }
    for (let x = 0; x <= 10; x += 2) s('text', { x: px(x), y: H - B + 18, 'text-anchor': 'middle', class: 'ml-tick' }, svg).textContent = String(x);
    s('line', { x1: L, x2: W - R, y1: H - B, y2: H - B, class: 'ml-baseline' }, svg);
    s('text', { x: (L + W - R) / 2, y: H - 8, 'text-anchor': 'middle', class: 'ml-axis' }, svg).textContent = 'Παραγγελίες τον χρόνο';
    s('text', { x: 14, y: 16, class: 'ml-axis' }, svg).textContent = 'Μέση αξία (€)';
    CUSTOMERS.forEach((p, i) => {
      const c = st.assign[i]!;
      const g = s('g', { tabindex: 0, role: 'img', 'aria-label': `${p.id}: ${p.x} παραγγελίες, ${p.y} €, ${c < 0 ? 'χωρίς ομάδα' : `ομάδα ${c + 1}`}` }, svg);
      if (c < 0) s('circle', { cx: px(p.x), cy: py(p.y), r: 7, fill: 'var(--text-muted)', stroke: 'var(--panel-solid)', 'stroke-width': 2 }, g);
      else mark(g, c, px(p.x), py(p.y), 8, COLOR[c]!);
      s('circle', { cx: px(p.x), cy: py(p.y), r: 16, fill: 'transparent' }, g);
      s('title', {}, g).textContent = `${p.id}: ${p.x} παραγγελίες, μέση αξία ${p.y} € · ${c < 0 ? 'χωρίς ομάδα ακόμα' : `ομάδα ${c + 1}`}`;
    });
    st.centres.forEach((c, i) => {
      const x = px(c.x), y = py(c.y), d = 9;
      s('path', { d: `M${x - d} ${y - d}L${x + d} ${y + d}M${x + d} ${y - d}L${x - d} ${y + d}`, stroke: 'var(--panel-solid)', 'stroke-width': 7, 'stroke-linecap': 'round' }, svg);
      s('path', { d: `M${x - d} ${y - d}L${x + d} ${y + d}M${x + d} ${y - d}L${x - d} ${y + d}`, stroke: COLOR[i]!, 'stroke-width': 3.5, 'stroke-linecap': 'round' }, svg);
      s('text', { x: x + 12, y: y - 10, class: 'ml-label' }, svg).textContent = `Κ${i + 1}`;
    });
    svg.setAttribute('aria-label', `Διάγραμμα διασποράς: ${CUSTOMERS.length} πελάτες και ${k} κέντρα.`);
    legend.textContent = `Ομάδες: ${Array.from({ length: k }, (_, i) => `${i + 1} = ${SHAPE[i]}`).join(', ')}. ✕ Κ1–Κ${k}: τα κέντρα. Γκρι: χωρίς ομάδα ακόμα.`;

    const assigned = st.assign.every((a) => a >= 0);
    stats.replaceChildren(...([
      ['Γύροι ανάθεσης', String(round)],
      ['Άθροισμα τετραγώνων απόστασης (WCSS)', assigned ? num(wcss(CUSTOMERS, st), 3) : '—'],
      ['Κατάσταση', phase === 'done' ? 'Σύγκλιση' : phase === 'update' ? 'Επόμενο: ενημέρωση' : 'Επόμενο: ανάθεση'],
    ] as [string, string][]).map(([a, b]) => { const c = h('div', { class: 'ml-stat' }); c.append(h('span', {}, a), h('strong', {}, b)); return c; }));
    hist.replaceChildren(...history.map((t) => h('li', {}, t)));
    tableWrap.replaceChildren(table(['Πελάτης', 'Παραγγελίες', 'Μέση αξία (€)', 'Ομάδα'], CUSTOMERS.map((p, i) => [p.id, p.x, p.y, st.assign[i]! < 0 ? '—' : `${st.assign[i]! + 1} (${SHAPE[st.assign[i]!]})`]), 'Πίνακας: οι πελάτες και η ομάδα τους'));
  }

  reset();
}
