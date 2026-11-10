/**
 * McCumber Explorer (CN6003 Week 1): pick a goal, a state of the information
 * and a means of protection. The student first thinks of a measure for that
 * cell, then reveals our e-shop example. A 3 × 3 grid shows where the cell
 * sits for the chosen goal. Data: src/lib/security-basics.ts (tested).
 */
import { GOALS, MEANS, STATES, mccumber, type Goal, type Means, type State } from '~/lib/security-basics';
import { button, card, h } from './ml-ui';
import './sec.css';

export function mount(root: HTMLElement): void {
  card(root, 'McCumber Explorer', 'Διάλεξε ένα «κυβάκι»: στόχο, κατάσταση της πληροφορίας και μέσο προστασίας. Σκέψου πρώτα εσύ ένα μέτρο για το e-shop, μετά δες το δικό μας παράδειγμα.');
  let goal: Goal = 'C', state: State = 'transmission', means: Means = 'technology';
  let shown = false;

  const group = <K extends string>(label: string, opts: [K, string][], get: () => K, set: (k: K) => void) => {
    const row = h('div', { class: 'ml-row', role: 'group', 'aria-label': label });
    row.append(h('span', { class: 'ml-q' }, `${label}:`));
    const btns = opts.map(([k, l]) => button(l, () => { set(k); shown = false; render(); }));
    row.append(...btns);
    return { row, sync: () => btns.forEach((b, i) => b.setAttribute('aria-pressed', String(opts[i]![0] === get()))) };
  };
  const g1 = group('Στόχος', GOALS, () => goal, (k) => (goal = k));
  const g2 = group('Κατάσταση', STATES, () => state, (k) => (state = k));
  const g3 = group('Μέσο', MEANS, () => means, (k) => (means = k));
  const cell = h('p', { class: 'sec-case', 'aria-live': 'polite' });
  const reveal = h('div', { class: 'ml-row' });
  const example = h('p', { class: 'ml-fb ok' });
  const grid = h('table', { class: 'sec-matrix' });
  const wrap = h('div', { class: 'ml-table', tabindex: '0', role: 'region', 'aria-label': 'Τα εννέα κυβάκια του στόχου' });
  wrap.append(grid);
  root.append(g1.row, g2.row, g3.row, cell, reveal, example, wrap,
    h('p', { class: 'ml-note' }, 'Συνολικά 3 × 3 × 3 = 27 συνδυασμοί. Ένα κυβάκι χωρίς μέτρο είναι κενό ασφάλειας. Τα παραδείγματα είναι δικά μας.'));

  function render() {
    [g1, g2, g3].forEach((g) => g.sync());
    const label = (list: [string, string][], k: string) => list.find(([x]) => x === k)![1].toLowerCase();
    cell.textContent = `Κυβάκι: ${label(GOALS, goal)} · ${label(STATES, state)} · ${label(MEANS, means)}. Ποιο μέτρο θα επέλεγες;`;
    reveal.replaceChildren(shown ? h('span') : button('Δείξε παράδειγμα', () => { shown = true; render(); }, 'primary'));
    example.hidden = !shown;
    example.textContent = `Παράδειγμα: ${mccumber(goal, state, means)}`;

    grid.replaceChildren(h('caption', {}, `Στόχος: ${label(GOALS, goal)}. Γραμμές: κατάσταση· στήλες: μέσο.`));
    const head = h('tr');
    head.append(h('th', { scope: 'col' }, ''));
    MEANS.forEach(([, l]) => head.append(h('th', { scope: 'col' }, l)));
    grid.append(head);
    for (const [s, sl] of STATES) {
      const tr = h('tr');
      tr.append(h('th', { scope: 'row' }, sl));
      for (const [m] of MEANS) {
        const on = s === state && m === means;
        const td = h('td', on ? { class: 'on', 'aria-current': 'true' } : {}, on ? '●' : '');
        tr.append(td);
      }
      grid.append(tr);
    }
  }

  render();
}
