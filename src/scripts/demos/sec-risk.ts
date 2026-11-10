/**
 * Risk Scoring Lab (CN6003 Week 1): likelihood 1–5 × impact 1–5 on a 5 × 5
 * matrix. The score is an ordinal priority, not a probability; the widget
 * says so next to the number. Logic: src/lib/security-basics.ts (tested).
 */
import { BAND_ADVICE, riskBand, riskScore } from '~/lib/security-basics';
import { card, h } from './ml-ui';
import './sec.css';

const BAND_CLASS = { Χαμηλός: 'sec-b1', Μέτριος: 'sec-b2', Υψηλός: 'sec-b3', Κρίσιμος: 'sec-b4' } as const;

export function mount(root: HTMLElement): void {
  card(root, 'Risk Scoring Lab', 'Κίνδυνος: διαρροή της βάσης πελατών του e-shop. Μετακίνησε τα sliders και δες πού πέφτει στον πίνακα.');
  let L = 4, I = 5;

  const slider = (label: string, value: number, set: (v: number) => void) => {
    const id = `risk-${label.length}-${Math.random().toString(36).slice(2, 7)}`;
    const lab = h('label', { for: id }, label);
    const input = h('input', { type: 'range', id, min: '1', max: '5', step: '1', value: String(value) });
    const out = h('output', { for: id }, String(value));
    input.addEventListener('input', () => { set(Number(input.value)); out.textContent = input.value; render(); });
    const row = h('div', { class: 'ml-row' });
    row.append(lab, input, out);
    return row;
  };
  const result = h('p', { class: 'ml-fb', 'aria-live': 'polite' });
  const advice = h('p', { class: 'ml-note' });
  const matrix = h('table', { class: 'sec-matrix' });
  const wrap = h('div', { class: 'ml-table', tabindex: '0', role: 'region', 'aria-label': 'Πίνακας κινδύνου 5 × 5' });
  wrap.append(matrix);
  root.append(
    slider('Πιθανότητα (Likelihood)', L, (v) => (L = v)),
    slider('Επίπτωση (Impact)', I, (v) => (I = v)),
    result,
    advice,
    wrap,
    h('p', { class: 'ml-warn' }, 'Ποιοτική κλίμακα: το 20/25 σημαίνει «πολύ ψηλά στη λίστα προτεραιότητας», όχι πιθανότητα 80%. Τα όρια των κατηγοριών είναι δική μας ενδεικτική επιλογή· κάθε οργανισμός ορίζει τα δικά του.'),
  );

  function render() {
    const score = riskScore(L, I);
    const band = riskBand(score);
    result.textContent = `Σκορ: ${L} × ${I} = ${score}/25 · κατηγορία: ${band}.`;
    advice.textContent = BAND_ADVICE[band];

    matrix.replaceChildren();
    const cap = h('caption', {}, 'Γραμμές: πιθανότητα (5 πάνω). Στήλες: επίπτωση.');
    const head = h('tr');
    head.append(h('th', { scope: 'col' }, 'P \\ I'));
    for (let c = 1; c <= 5; c++) head.append(h('th', { scope: 'col' }, String(c)));
    matrix.append(cap, head);
    for (let r = 5; r >= 1; r--) {
      const tr = h('tr');
      tr.append(h('th', { scope: 'row' }, String(r)));
      for (let c = 1; c <= 5; c++) {
        const s = r * c;
        const td = h('td', { class: BAND_CLASS[riskBand(s)] }, String(s));
        if (r === L && c === I) { td.classList.add('on'); td.setAttribute('aria-current', 'true'); }
        tr.append(td);
      }
      matrix.append(tr);
    }
  }

  render();
}
