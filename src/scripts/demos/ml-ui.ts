/**
 * Shared bits of the CN6005 Week 5 ML widgets (ml-regression, ml-preprocess,
 * ml-kmeans, ml-assoc, ml-dtree): element helpers, Greek number format and
 * the «Πρόβλεψε → Εκτέλεσε → Εξήγησε» box. Styles: ml.css.
 */
import './ml.css';

export const SVG = 'http://www.w3.org/2000/svg';

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, text?: string) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text;
  return e;
}

export function s(tag: string, attrs: Record<string, string | number>, parent: Element) {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent.append(e);
  return e;
}

/** 0.25 → «0,25»; 1234.5 → «1.234,5». */
export const num = (v: number, digits = 2) =>
  Number.isNaN(v) ? '—' : v.toLocaleString('el-GR', { maximumFractionDigits: digits, minimumFractionDigits: 0 });

export const pct = (v: number) => (Number.isNaN(v) ? '—' : `${num(v * 100, 0)}%`);

export function button(label: string, onClick: () => void, cls = '') {
  const b = h('button', { type: 'button', class: cls }, label);
  b.addEventListener('click', onClick);
  return b;
}

/** The card every widget sits in. */
export function card(root: HTMLElement, title: string, lead: string) {
  root.replaceChildren();
  root.classList.add('ml');
  root.append(h('p', { class: 'ml-title' }, title), h('p', { class: 'ml-lead' }, lead));
}

/**
 * «Πρόβλεψε»: a question with options. The answer is revealed only after the
 * student picks one (or presses «Δείξε»), then `onDone` runs the step.
 */
export function predictBox(question: string, options: string[], answer: string, why: string, onDone: () => void) {
  const box = h('div', { class: 'ml-predict', 'aria-live': 'polite' });
  box.append(h('p', { class: 'ml-q' }, `Πρόβλεψε: ${question}`));
  const opts = h('div', { class: 'ml-opts' });
  const finish = (picked?: string) => {
    opts.querySelectorAll('button').forEach((b) => ((b as HTMLButtonElement).disabled = true));
    const ok = picked === answer;
    const msg = picked === undefined ? `Η απάντηση: ${answer}.` : ok ? 'Σωστά.' : `Όχι: η απάντηση είναι ${answer}.`;
    box.append(h('p', { class: `ml-fb ${picked === undefined ? '' : ok ? 'ok' : 'bad'}` }, `${msg} ${why}`));
    onDone();
  };
  for (const o of options) opts.append(button(o, () => finish(o)));
  opts.append(button('Δείξε', () => finish(), 'ml-quiet'));
  box.append(opts);
  return box;
}

export function table(head: string[], rows: (string | number)[][], caption?: string, rowCls: (i: number) => string = () => '') {
  const wrap = h('div', { class: 'ml-table', tabindex: '0', role: 'region', 'aria-label': caption ?? 'Πίνακας' });
  const t = h('table');
  if (caption) t.append(h('caption', {}, caption));
  const tr = h('tr');
  head.forEach((c) => tr.append(h('th', { scope: 'col' }, c)));
  t.append(h('thead'), h('tbody'));
  t.querySelector('thead')!.append(tr);
  rows.forEach((r, i) => {
    const row = h('tr', rowCls(i) ? { class: rowCls(i) } : {});
    r.forEach((c) => row.append(h('td', {}, typeof c === 'number' ? num(c) : c)));
    t.querySelector('tbody')!.append(row);
  });
  wrap.append(t);
  return wrap;
}
