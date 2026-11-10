/**
 * Tic-tac-toe practice for CN6005 Week 4: the student picks X's move (MAX),
 * sees O's best reply (MIN) and the end of the game, with its value +1 / 0 / −1.
 * Once every move has been tried, the Minimax decision is shown. Mounted into
 * <div data-demo="tictactoe">; the values come from src/lib/tictactoe.ts.
 */
import './tictactoe.css';
import { lines, play, PRACTICE, type Board, type Line } from '~/lib/tictactoe';

function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, text?: string) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text;
  return e;
}

const pos = (i: number) => `γραμμή ${Math.floor(i / 3) + 1}, στήλη ${(i % 3) + 1}`;
const val = (v: number) => (v > 0 ? '+1' : v < 0 ? '−1' : '0');
const outcome = (v: number) => (v > 0 ? 'νίκη του X' : v < 0 ? 'νίκη του O' : 'ισοπαλία');

function board(b: Board, opts: { mark?: Set<number>; onPick?: (i: number) => void; pickable?: Set<number>; label: string }) {
  const g = h('div', { class: 'ttt-board', role: 'group', 'aria-label': opts.label });
  b.forEach((c, i) => {
    if (opts.onPick && opts.pickable?.has(i)) {
      const btn = h('button', { type: 'button', class: 'ttt-cell pick', 'aria-label': `X στη ${pos(i)}` }, '');
      btn.addEventListener('click', () => opts.onPick!(i));
      g.append(btn);
    } else {
      g.append(h('span', { class: `ttt-cell ${opts.mark?.has(i) ? 'new' : ''}`, 'aria-label': `${pos(i)}: ${c === ' ' ? 'κενό' : c}` }, c === ' ' ? '' : c));
    }
  });
  return g;
}

export function mount(root: HTMLElement): void {
  const all = lines(PRACTICE);
  const tried = new Map<number, Line>();
  let last: Line | undefined;
  root.replaceChildren();
  root.classList.add('ttt');

  function render() {
    root.replaceChildren();
    const top = h('div', { class: 'ttt-top' });
    const pick = h('div', { class: 'ttt-col' });
    pick.append(h('p', { class: 'ttt-h' }, 'Παίζει ο X (MAX). Διάλεξε τετράγωνο:'));
    pick.append(board(PRACTICE, { label: 'Η θέση', pickable: new Set(all.map((l) => l.move)), onPick: choose }));
    top.append(pick);
    if (last) {
      const res = h('div', { class: 'ttt-col', 'aria-live': 'polite' });
      let b = PRACTICE;
      const steps = h('div', { class: 'ttt-steps' });
      last.moves.forEach((m, k) => {
        b = play(b, m.cell, m.who);
        const wrap = h('div', { class: 'ttt-step' });
        wrap.append(board(b, { label: `Μετά την κίνηση ${k + 1}`, mark: new Set([m.cell]) }));
        wrap.append(h('span', {}, `${k + 1}. ${m.who} στη ${pos(m.cell)}`));
        steps.append(wrap);
      });
      res.append(h('p', { class: 'ttt-h' }, `Αν ο X παίξει στη ${pos(last.move)}:`), steps);
      const why = last.moves.length === 1
        ? 'Ο X κάνει αμέσως τρίλιζα.'
        : `Ο O (MIN) απαντά με την καλύτερη για εκείνον κίνηση, στη ${pos(last.reply!)}.`;
      res.append(h('p', { class: `ttt-value v${Math.sign(last.value) + 1}` }, `${why} Αποτέλεσμα: ${outcome(last.value)}, τιμή ${val(last.value)}.`));
      top.append(res);
    }
    root.append(top);

    const summary = h('div', { class: 'ttt-summary' });
    summary.append(h('p', { class: 'ttt-h' }, `Τιμές των κινήσεων (${tried.size} / ${all.length}):`));
    const list = h('ul');
    for (const l of all) {
      const t = tried.get(l.move);
      list.append(h('li', {}, `X στη ${pos(l.move)}: ${t ? `${val(t.value)} (${outcome(t.value)})` : '?'}`));
    }
    summary.append(list);
    if (tried.size === all.length) {
      const best = all.reduce((a, b) => (b.value > a.value ? b : a));
      summary.append(h('p', { class: 'ttt-decision' }, `Απόφαση Minimax: max(${all.map((l) => val(l.value)).join(', ')}) = ${val(best.value)}. Ο X παίζει στη ${pos(best.move)} και κερδίζει.`));
    } else {
      summary.append(h('p', { class: 'ttt-hint' }, 'Δοκίμασε και τις τρεις κινήσεις για να δεις την απόφαση του Minimax.'));
    }
    root.append(summary);
  }

  function choose(i: number) {
    last = all.find((l) => l.move === i)!;
    tried.set(i, last);
    render();
  }

  render();
}
