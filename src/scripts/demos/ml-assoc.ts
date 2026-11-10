/**
 * Association Rules Calculator (CN6005 Week 5, priority 4): pick the items of
 * X and Y in a rule X → Y; the baskets with X and with X ∪ Y are highlighted,
 * and support, confidence and lift are computed after a prediction.
 * Datasets: the lesson's basket and the lecture's (slide 72).
 * Logic: src/lib/ml-lab.ts (tested).
 */
import { itemsOf, LECTURE_BASKET, rule, SHOP, type Basket } from '~/lib/ml-lab';
import { button, card, h, num, pct, predictBox } from './ml-ui';

const SETS: { label: string; data: Basket[]; x: string[]; y: string[] }[] = [
  { label: 'Καλάθια των σημειώσεων', data: SHOP, x: ['καφές'], y: ['ζάχαρη'] },
  { label: 'Καλάθια της διάλεξης', data: LECTURE_BASKET, x: ['Diapers'], y: ['Beer'] },
];

export function mount(root: HTMLElement): void {
  let set = 0;
  let x: string[] = [], y: string[] = [];
  let revealed = false;
  card(root, 'Association Rules Calculator', 'Φτιάξε έναν κανόνα X → Y: διάλεξε προϊόντα αριστερά (X) και δεξιά (Y). Οι αποδείξεις με το X τονίζονται ελαφρά, όσες έχουν και το X και το Y πιο έντονα.');

  const setRow = h('div', { class: 'ml-row', role: 'group', 'aria-label': 'Δεδομένα' });
  const setBtns = SETS.map((d, i) => button(d.label, () => { set = i; load(); }));
  setRow.append(...setBtns);
  const xRow = h('div', { class: 'ml-row', role: 'group', 'aria-label': 'Αριστερά του κανόνα (X)' });
  const yRow = h('div', { class: 'ml-row', role: 'group', 'aria-label': 'Δεξιά του κανόνα (Y)' });
  const ruleText = h('p', { class: 'ml-title' });
  const counts = h('p', { class: 'ml-note' });
  const ask = h('div');
  const stats = h('div', { class: 'ml-stats' });
  const why = h('p', { class: 'ml-note' });
  const tableWrap = h('div');
  root.append(setRow, xRow, yRow, ruleText, tableWrap, counts, ask, stats, why);

  function load() {
    x = [...SETS[set]!.x];
    y = [...SETS[set]!.y];
    revealed = false;
    render();
  }

  function toggle(side: 'x' | 'y', item: string) {
    const [mine, other] = side === 'x' ? [x, y] : [y, x];
    const i = mine.indexOf(item);
    if (i >= 0) mine.splice(i, 1);
    else { mine.push(item); const j = other.indexOf(item); if (j >= 0) other.splice(j, 1); }
    revealed = false;
    render();
  }

  function render() {
    const data = SETS[set]!.data;
    setBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === set)));
    const items = itemsOf(data);
    xRow.replaceChildren(h('span', {}, 'X:'), ...items.map((it) => { const b = button(it, () => toggle('x', it)); b.setAttribute('aria-pressed', String(x.includes(it))); return b; }));
    yRow.replaceChildren(h('span', {}, 'Y:'), ...items.map((it) => { const b = button(it, () => toggle('y', it)); b.setAttribute('aria-pressed', String(y.includes(it))); return b; }));
    ruleText.textContent = `Κανόνας: {${x.join(', ') || '…'}} → {${y.join(', ') || '…'}}`;

    const t = h('table');
    const trh = h('tr');
    ['Απόδειξη', 'Προϊόντα', 'Έχει X;', 'Έχει X και Y;'].forEach((c) => trh.append(h('th', { scope: 'col' }, c)));
    const thead = h('thead'); thead.append(trh);
    const tbody = h('tbody');
    for (const b of data) {
      const hx = x.length > 0 && x.every((i) => b.items.includes(i));
      const hxy = hx && y.length > 0 && y.every((i) => b.items.includes(i));
      const tr = h('tr', hxy ? { class: 'hit' } : hx ? { class: 'hit-x' } : {});
      tr.append(h('td', {}, b.id), h('td', {}, b.items.join(', ')), h('td', {}, hx ? 'ναι' : '—'), h('td', {}, hxy ? 'ναι' : '—'));
      tbody.append(tr);
    }
    t.append(thead, tbody);
    const wrap = h('div', { class: 'ml-table', tabindex: '0', role: 'region', 'aria-label': 'Οι αποδείξεις' });
    wrap.append(t);
    tableWrap.replaceChildren(wrap);

    ask.replaceChildren();
    stats.replaceChildren();
    why.textContent = '';
    if (!x.length || !y.length) { counts.textContent = 'Διάλεξε τουλάχιστον ένα προϊόν για το X και ένα για το Y.'; return; }
    const r = rule(data, x, y);
    counts.textContent = `Το X υπάρχει σε ${r.withX} από τις ${r.n} αποδείξεις, το X μαζί με το Y σε ${r.withXY}, και το Y σε ${r.withY}.`;
    if (!r.withX) { why.textContent = 'Καμία απόδειξη δεν έχει το X, άρα η εμπιστοσύνη δεν ορίζεται.'; return; }
    const conf = pct(r.confidence);
    if (!revealed) {
      const opts = [...new Set([conf, pct(r.support), pct(r.withXY / Math.max(r.withY, 1)), pct(r.withX / r.n)])].sort((a, b) => parseFloat(a) - parseFloat(b));
      ask.append(predictBox('ποια είναι η εμπιστοσύνη (confidence) του κανόνα;', opts, conf,
        `Εμπιστοσύνη = (αποδείξεις με X και Y) / (αποδείξεις με X) = ${r.withXY}/${r.withX}.`, () => { revealed = true; showStats(); }));
      return;
    }
    showStats();

    function showStats() {
      stats.replaceChildren(...([
        ['Support', `${r.withXY}/${r.n} = ${pct(r.support)}`],
        ['Confidence', `${r.withXY}/${r.withX} = ${conf}`],
        ['Lift', num(r.lift, 2)],
      ] as [string, string][]).map(([a, b]) => { const c = h('div', { class: 'ml-stat' }); c.append(h('span', {}, a), h('strong', {}, b)); return c; }));
      why.textContent = `Support: πόσο συχνά εμφανίζονται X και Y μαζί σε όλες τις αποδείξεις. Confidence: από όσες έχουν X, πόσες έχουν και Y. Lift = confidence / P(Y) = ${conf} / ${pct(r.withY / r.n)} = ${num(r.lift, 2)}: ${r.lift > 1.0001 ? 'πάνω από 1, άρα το X κάνει το Y πιο πιθανό απ’ ό,τι συνήθως' : r.lift < 0.9999 ? 'κάτω από 1, άρα το X κάνει το Y λιγότερο πιθανό' : 'ίσο με 1, άρα το X δεν αλλάζει την πιθανότητα του Y'}. Κανένα από τα τρία δεν σημαίνει αιτιότητα.`;
    }
  }

  load();
}
