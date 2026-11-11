/**
 * Permissions calculator (CN6003 Week 5): a 3 × 3 grid of r/w/x boxes for
 * user, group and others, kept in step with the octal number, the `ls -l`
 * string and a chmod command typed in either form. Then a short quiz on the
 * lecture's own examples. Logic: src/lib/shell-lab.ts (applyMode, permString,
 * octalOf; tested).
 */
import { applyMode, octalOf, permString } from '~/lib/shell-lab';
import { button, card, h, predictBox } from './ml-ui';
import './sec.css';

const WHO = [['u', 'Ιδιοκτήτης (u)'], ['g', 'Ομάδα (g)'], ['o', 'Άλλοι (o)']] as const;
const WHAT = [['r', 'ανάγνωση', 4], ['w', 'εγγραφή', 2], ['x', 'εκτέλεση', 1]] as const;

export function mount(root: HTMLElement): void {
  card(root, 'Υπολογιστής δικαιωμάτων chmod', 'Πάτα τα κουτάκια ή γράψε μια εντολή chmod (οκταδική, π.χ. 640, ή συμβολική, π.χ. go=r ή u+x). Τα τρία πεδία μένουν πάντα συγχρονισμένα.');
  let mode = 0o644;
  const grid = h('div', { class: 'sec-matrix-wrap' });
  const out = h('div', { class: 'sec-perm', 'aria-live': 'polite' });
  const form = h('form', { class: 'ml-row' });
  const input = h('input', { type: 'text', value: '', placeholder: 'π.χ. 750 ή u=rwx,g=rx,o=', 'aria-label': 'Όρισμα chmod', autocomplete: 'off', spellcheck: 'false' });
  const msg = h('p', { class: 'ml-note', 'aria-live': 'polite' });
  const lbl = h('label', { class: 'sec-mono' });
  lbl.append(document.createTextNode('chmod '), input, document.createTextNode(' file'));
  form.append(lbl, button('Εφάρμοσε', () => form.requestSubmit(), 'primary'));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const m = applyMode(mode, input.value.trim());
    if (typeof m === 'string') msg.textContent = m;
    else {
      msg.textContent = `chmod ${input.value.trim()}: ${permString(mode).slice(1)} → ${permString(m).slice(1)}`;
      mode = m;
      render();
    }
  });

  function render() {
    const t = h('table', { class: 'sec-matrix' });
    const head = h('tr');
    head.append(h('th', {}, ''));
    WHAT.forEach(([c, name, v]) => head.append(h('th', { scope: 'col' }, `${c} = ${v} (${name})`)));
    head.append(h('th', { scope: 'col' }, 'Ψηφίο'));
    t.append(head);
    WHO.forEach(([who, name], row) => {
      const tr = h('tr');
      tr.append(h('th', { scope: 'row' }, name));
      WHAT.forEach(([c, what, v]) => {
        const bit = v << (3 * (2 - row));
        const on = (mode & bit) !== 0;
        const b = button(on ? c : '-', () => { mode ^= bit; msg.textContent = ''; render(); }, 'sec-cell');
        b.setAttribute('aria-pressed', String(on));
        b.setAttribute('aria-label', `${name}: ${what}`);
        const td = h('td');
        td.append(b);
        tr.append(td);
      });
      tr.append(h('td', { class: 'sec-mono' }, String((mode >> (3 * (2 - row))) & 7)));
      tr.dataset.who = who;
      t.append(tr);
    });
    grid.replaceChildren(t);
    const perm = permString(mode);
    out.replaceChildren(
      h('p', {}, `ls -l: ${perm}`),
      h('p', {}, `Οκταδικά: ${octalOf(perm.slice(1))}  ·  chmod ${octalOf(perm.slice(1))} file`),
      h('p', {}, `Συμβολικά: chmod u=${sym(mode >> 6)},g=${sym(mode >> 3)},o=${sym(mode)} file`),
    );
  }
  const sym = (d: number) => `${d & 4 ? 'r' : ''}${d & 2 ? 'w' : ''}${d & 1 ? 'x' : ''}`;

  const quiz = h('div');
  const questions: [string, string[], string, string][] = [
    ['ποια δικαιώματα δίνει το chmod 640;', ['-rw-r-----', '-rw-r--r--', '-rwxr-----'], '-rw-r-----', '6 = 4 + 2 (rw), 4 = r, 0 = τίποτα.'],
    ['το αρχείο είναι -r-xr-xr-x και τρέχεις chmod go=r. Τι γίνεται; (διάλεξη)', ['-r-xr--r--', '-r--r--r--', '-r-xr-xr--'], '-r-xr--r--', 'Το = δίνει ακριβώς r σε ομάδα και άλλους· ο ιδιοκτήτης δεν αλλάζει.'],
    ['ποιο οκταδικό αντιστοιχεί στο rwxr-xr--;', ['754', '745', '654'], '754', 'rwx = 7, r-x = 5, r-- = 4.'],
  ];
  let i = 0;
  const next = () => {
    const q = questions[i++];
    if (!q) return;
    quiz.append(predictBox(q[0], q[1], q[2], q[3], next));
  };
  next();
  root.append(grid, out, form, msg, h('p', { class: 'ml-q' }, 'Μικρό κουίζ'), quiz);
  render();
}
