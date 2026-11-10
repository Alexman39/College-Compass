/**
 * Network Traffic Explorer (CN6003 Week 4): one synthetic minute of a small
 * office network as an I/O graph (packets or bits per second), a protocol
 * filter, and the conversations behind any second you pick. The point: a
 * peak is not automatically an attack. Single series → one hue, no legend;
 * every bar has a hover/focus tooltip; the table is the text view.
 * Data: src/lib/packet-lab.ts (tested).
 */
import { perSecond, topTalkers, trafficMinute, type Pkt } from '~/lib/packet-lab';
import { button, card, h, predictBox, s, num } from './ml-ui';
import './sec.css';

const ALL = trafficMinute();
const PROTOS = ['Όλα', 'HTTPS', 'HTTP', 'DNS', 'SMB', 'ARP'] as const;

export function mount(root: HTMLElement): void {
  card(root, 'Network Traffic Explorer', 'Συνθετικά δεδομένα ενός λεπτού (όχι πραγματική καταγραφή), όπως στο Statistics → I/O Graphs. Πάτησε μια στήλη για να δεις ποιοι μιλούν εκείνο το δευτερόλεπτο.');
  let proto: (typeof PROTOS)[number] = 'Όλα';
  let unit: 'packets' | 'bits' = 'packets';
  let pick: number | null = null;

  const fRow = h('div', { class: 'ml-row', role: 'group', 'aria-label': 'Φίλτρο πρωτοκόλλου' });
  const uRow = h('div', { class: 'ml-row', role: 'group', 'aria-label': 'Μονάδα' });
  const chart = h('div', { class: 'ml-chart' });
  const tip = h('p', { class: 'ml-note', 'aria-live': 'polite' });
  const detail = h('div', { 'aria-live': 'polite' });
  const ask = h('div');
  ask.append(predictBox('η κορυφή στα 20–25 δευτερόλεπτα είναι επίθεση;', ['Ναι, σίγουρα', 'Δεν φαίνεται από το γράφημα μόνο'], 'Δεν φαίνεται από το γράφημα μόνο',
    'Μια αιχμή μπορεί να είναι download, backup ή ενημέρωση. Πάτησε τη στήλη: εδώ είναι HTTPS από ένα CDN προς τον υπολογιστή, δηλαδή μια λήψη. Η αξιολόγηση θέλει endpoints, θύρες και πρωτόκολλα.', () => {}));
  root.append(fRow, uRow, chart, tip, ask, detail);

  const filtered = (): Pkt[] => (proto === 'Όλα' ? ALL : ALL.filter((p) => p.proto === proto));

  function render() {
    fRow.replaceChildren(...PROTOS.map((p) => { const b = button(p, () => { proto = p; render(); }); b.setAttribute('aria-pressed', String(p === proto)); return b; }));
    uRow.replaceChildren(...([['packets', 'Πακέτα/s'], ['bits', 'bits/s']] as const).map(([u, l]) => { const b = button(l, () => { unit = u; render(); }); b.setAttribute('aria-pressed', String(u === unit)); return b; }));

    const data = perSecond(filtered(), unit);
    const W = 600, H = 220, L = 56, B = 30, T = 12, R = 8;
    const max = Math.max(1, ...data);
    const nice = (() => { const p = 10 ** Math.floor(Math.log10(max)); for (const m of [1, 2, 5, 10]) if (m * p >= max) return m * p; return max; })();
    const y = (v: number) => T + (H - T - B) * (1 - v / nice);
    const bw = (W - L - R) / 60;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', `I/O graph: ${unit === 'packets' ? 'πακέτα' : 'bits'} ανά δευτερόλεπτο, φίλτρο ${proto}, μέγιστο ${num(max, 0)}.`);
    for (const f of [0, 0.5, 1]) {
      s('line', { x1: L, x2: W - R, y1: y(nice * f), y2: y(nice * f), class: f === 0 ? 'ml-baseline' : 'ml-grid' }, svg);
      s('text', { x: L - 6, y: y(nice * f) + 4, 'text-anchor': 'end', class: 'ml-tick' }, svg).textContent = num(nice * f, 0);
    }
    for (const t of [0, 10, 20, 30, 40, 50, 59]) s('text', { x: L + t * bw + bw / 2, y: H - 10, 'text-anchor': 'middle', class: 'ml-tick' }, svg).textContent = `${t}s`;
    data.forEach((v, t) => {
      const x = L + t * bw;
      if (v > 0) {
        const top = y(v), base = y(0), r = Math.min(4, bw / 2 - 1, base - top);
        const w = bw - 2;
        s('path', { d: `M${x + 1} ${base}V${top + r}q0 ${-r} ${r} ${-r}h${w - 2 * r}q${r} 0 ${r} ${r}V${base}Z`, style: `fill:${t === pick ? 'var(--accent)' : 'var(--ml-c1)'}` }, svg);
      }
      // hit target: the full column, bigger than the mark
      const hit = s('rect', { x, y: T, width: bw, height: H - T - B, fill: 'transparent', tabindex: '0', role: 'button', 'aria-label': `Δευτερόλεπτο ${t}: ${num(v, 0)} ${unit === 'packets' ? 'πακέτα' : 'bits'}` }, svg);
      const show = () => { tip.textContent = `${t}s: ${num(v, 0)} ${unit === 'packets' ? 'πακέτα/s' : 'bits/s'}`; };
      hit.addEventListener('mouseenter', show);
      hit.addEventListener('focus', show);
      hit.addEventListener('click', () => { pick = t; render(); });
      hit.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') { e.preventDefault(); pick = t; render(); } });
    });
    s('text', { x: 12, y: (H - B) / 2, transform: `rotate(-90 12 ${(H - B) / 2})`, 'text-anchor': 'middle', class: 'ml-axis' }, svg).textContent = unit === 'packets' ? 'πακέτα/s' : 'bits/s';
    chart.replaceChildren(svg);
    if (!tip.textContent) tip.textContent = 'Πέρασε τον δείκτη πάνω από μια στήλη (ή πάτησε Tab) για την τιμή της.';

    detail.replaceChildren();
    const scope = pick === null ? filtered() : filtered().filter((p) => p.t === pick);
    const rows = topTalkers(scope).slice(0, 6);
    const wrap = h('div', { class: 'ml-table', tabindex: '0', role: 'region', 'aria-label': 'Συνομιλίες' });
    const t = h('table');
    t.append(h('caption', {}, pick === null ? `Top talkers σε όλο το λεπτό (φίλτρο: ${proto})` : `Συνομιλίες στο δευτερόλεπτο ${pick} (φίλτρο: ${proto})`));
    const head = h('tr');
    ['Αποστολέας → Παραλήπτης', 'Πρωτόκολλο', 'Πακέτα', 'Bytes'].forEach((c) => head.append(h('th', { scope: 'col' }, c)));
    t.append(head);
    for (const r of rows) {
      const tr = h('tr');
      tr.append(h('td', { class: 'sec-mono' }, r.pair), h('td', {}, r.proto), h('td', {}, num(r.packets, 0)), h('td', {}, num(r.bytes, 0)));
      t.append(tr);
    }
    if (!rows.length) { const tr = h('tr'); tr.append(h('td', { colspan: '4' }, 'Καμία κίνηση με αυτό το φίλτρο εκεί.')); t.append(tr); }
    wrap.append(t);
    detail.append(wrap);
    if (pick !== null) detail.append(button('Όλο το λεπτό', () => { pick = null; render(); }, 'ml-quiet'));
  }

  render();
}
