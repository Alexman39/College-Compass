/**
 * Attack Tree Calculator (CN6003 Week 2). Two lecture trees: company Χ
 * (probabilities) and the safe (costs). Each inner node has an AND/OR
 * switch and each leaf an editable value. The bottom-up calculation is
 * walked one node at a time: the student types a prediction (or presses
 * «Δείξε») before each result appears. «Κράτα ως πριν» stores the root so a
 * change (e.g. a countermeasure) can be compared before/after.
 * Logic: src/lib/attack-tree-calc.ts (tested).
 */
import { COMPANY_X, SAFE, evaluate, type Gate, type Mode, type TreeNode } from '~/lib/attack-tree-calc';
import { button, card, h } from './ml-ui';
import './sec.css';

const TREES: { key: string; label: string; tree: TreeNode; mode: Mode }[] = [
  { key: 'x', label: 'Εταιρεία Χ (πιθανότητα)', tree: COMPANY_X, mode: 'probability' },
  { key: 'safe', label: 'Χρηματοκιβώτιο (κόστος)', tree: SAFE, mode: 'cost' },
];

const show = (v: number, mode: Mode) =>
  !Number.isFinite(v)
    ? 'αδύνατο'
    : mode === 'cost'
      ? `${v.toLocaleString('el-GR')} $`
      : `${v.toLocaleString('el-GR', { maximumFractionDigits: 4 })} (${(v * 100).toLocaleString('el-GR', { maximumFractionDigits: 1 })}%)`;

export function mount(root: HTMLElement): void {
  card(root, 'Attack Tree Calculator', 'Άλλαξε τελεστές (AND/OR) και τιμές φύλλων. Ο υπολογισμός γίνεται από κάτω προς τα πάνω, ένας κόμβος τη φορά: πρόβλεψε το αποτέλεσμα πριν το δεις.');

  let ti = 0;
  let gates: Record<string, Gate> = {};
  let values: Record<string, number> = {};
  let noEquipment = false;
  let k = 0; // steps revealed
  let baseline: number | null = null;
  let note = '';
  let lastFb: { text: string; cls: string } | null = null;

  const treeRow = h('div', { class: 'ml-row', role: 'group', 'aria-label': 'Δέντρο' });
  const treeBtns = TREES.map((t, i) => button(t.label, () => { ti = i; gates = {}; values = {}; noEquipment = false; baseline = null; restart(); }));
  treeRow.append(...treeBtns);
  const opts = h('div', { class: 'ml-row' });
  const warn = h('p', { class: 'ml-warn' });
  const list = h('ul', { class: 'ml-tree', 'aria-label': 'Το δέντρο' });
  const stepBox = h('div', { class: 'ml-predict', 'aria-live': 'polite' });
  const nav = h('div', { class: 'ml-row' });
  const steps = h('div');
  const compare = h('p', { class: 'ml-note', 'aria-live': 'polite' });
  root.append(treeRow, opts, warn, list, stepBox, nav, steps, compare);

  const cur = () => TREES[ti]!;
  const calc = () => evaluate(cur().tree, cur().mode, { gates, values, noEquipment });

  function restart() { k = 0; note = ''; lastFb = null; render(); }

  function render() {
    const { tree, mode } = cur();
    const r = calc();
    const revealed = new Set(r.steps.slice(0, k).map((s) => s.id));
    const current = r.steps[k];
    treeBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === ti)));

    opts.replaceChildren();
    if (mode === 'cost') {
      const id = `noeq-${Math.random().toString(36).slice(2, 7)}`;
      const cb = h('input', { type: 'checkbox', id });
      (cb as HTMLInputElement).checked = noEquipment;
      cb.addEventListener('change', () => { noEquipment = (cb as HTMLInputElement).checked; restart(); });
      const lab = h('label', { for: id }, 'Χωρίς ειδικό εξοπλισμό (αποκλείονται τα φύλλα «ΕΕ»)');
      lab.prepend(cb);
      opts.append(lab);
    }
    opts.append(button('Αρχικές τιμές', () => { gates = {}; values = {}; noEquipment = false; restart(); }, 'ml-quiet'));

    warn.textContent = mode === 'probability'
      ? 'Οι τύποι υποθέτουν ανεξάρτητα γεγονότα: AND = p₁ × p₂ × …, OR = 1 − (1 − p₁)(1 − p₂)…. Οι τιμές είναι υποθετικές πιθανότητες μοντέλου, όχι πρόβλεψη πραγματικών περιστατικών.'
      : 'Κόστος: OR = το φθηνότερο παιδί (ο επιτιθέμενος διαλέγει τη φθηνότερη διαδρομή), AND = το άθροισμα των παιδιών. Το «ελάχιστο» αφορά κόστος, όχι πιθανότητα.';

    // the tree as an indented list: gate switches on inner nodes, inputs on leaves
    list.replaceChildren();
    const walk = (n: TreeNode, depth: number) => {
      const li = h('li', { style: `margin-left:${depth * 1.25}rem` });
      if (current && current.id === n.id) li.classList.add('on');
      if (n.children?.length) {
        const gate = gates[n.id] ?? n.gate ?? 'OR';
        const g = button(gate, () => { gates = { ...gates, [n.id]: gate === 'OR' ? 'AND' : 'OR' }; restart(); });
        g.setAttribute('aria-label', `Τελεστής του κόμβου «${n.label}»: ${gate}. Πάτησε για αλλαγή.`);
        const val = revealed.has(n.id) ? show(r.values[n.id]!, mode) : '?';
        li.append(g, document.createTextNode(` ${n.label}: `), h('strong', {}, val));
        list.append(li);
        n.children.forEach((c) => walk(c, depth + 1));
      } else {
        const id = `leaf-${n.id}-${Math.random().toString(36).slice(2, 6)}`;
        const input = h('input', {
          type: 'number', id, min: '0', step: mode === 'cost' ? '1000' : '0.01',
          ...(mode === 'probability' ? { max: '1' } : {}),
        }) as HTMLInputElement;
        input.value = String(values[n.id] ?? n.value);
        input.addEventListener('change', () => {
          const v = Number(input.value);
          const ok = Number.isFinite(v) && v >= 0 && (mode === 'cost' || v <= 1);
          if (!ok) { note = mode === 'cost' ? 'Το κόστος πρέπει να είναι αριθμός ≥ 0.' : 'Η πιθανότητα πρέπει να είναι από 0 έως 1.'; render(); return; }
          values = { ...values, [n.id]: v };
          restart();
        });
        const lab = h('label', { for: id }, `${n.label}${n.equipment ? ' (ΕΕ)' : ''}`);
        li.append(lab, input);
        list.append(li);
      }
    };
    walk(tree, 0);

    // the current step: predict, then reveal
    stepBox.replaceChildren();
    if (note) stepBox.append(h('p', { class: 'ml-fb bad' }, note));
    if (lastFb) stepBox.append(h('p', { class: `ml-fb ${lastFb.cls}` }, lastFb.text));
    if (current) {
      stepBox.append(h('p', { class: 'ml-q' }, `Βήμα ${k + 1} από ${r.steps.length}: κόμβος «${current.label}» (${current.gate}).`));
      const shownInputs = current.inputs.map((v) => show(v, mode)).join(' · ');
      stepBox.append(h('p', { class: 'ml-note' }, `Τιμές των παιδιών: ${shownInputs}`));
      const pid = `pred-${Math.random().toString(36).slice(2, 7)}`;
      const pred = h('input', { type: 'number', id: pid, step: 'any', inputmode: 'decimal' }) as HTMLInputElement;
      const row = h('div', { class: 'ml-row' });
      row.append(h('label', { for: pid }, mode === 'cost' ? 'Η πρόβλεψή σου ($):' : 'Η πρόβλεψή σου (0–1):'), pred);
      const fb = h('p', { class: 'ml-fb' });
      fb.hidden = true;
      const reveal = (ok?: boolean) => {
        lastFb = {
          cls: ok === undefined ? '' : ok ? 'ok' : 'bad',
          text: `${ok === undefined ? '' : ok ? 'Σωστά. ' : 'Όχι ακριβώς. '}«${current.label}»: ${current.formula}${mode === 'cost' ? ' $' : ''}`,
        };
        note = '';
        k++;
        render();
      };
      row.append(
        button('Έλεγχος', () => {
          const v = Number(pred.value.replace(',', '.'));
          if (pred.value.trim() === '' || !Number.isFinite(v)) { fb.hidden = false; fb.className = 'ml-fb bad'; fb.textContent = 'Γράψε έναν αριθμό, ή πάτησε «Δείξε».'; return; }
          const target = current.result;
          const ok = mode === 'cost' ? v === target : Math.abs(v - target) < 0.005;
          reveal(ok);
        }, 'primary'),
        button('Δείξε', () => reveal(), 'ml-quiet'),
      );
      stepBox.append(row, fb);
    } else {
      stepBox.append(h('p', { class: 'ml-fb ok' }, `Ρίζα «${tree.label}»: ${show(r.value, mode)}.`));
    }

    nav.replaceChildren(
      button('Προηγούμενο', () => { if (k > 0) { k--; lastFb = null; render(); } }),
      button('Δείξε όλα', () => { k = r.steps.length; lastFb = null; render(); }, 'ml-quiet'),
      button('Από την αρχή', () => restart()),
      button('Κράτα ως «πριν»', () => { baseline = r.value; render(); }, 'ml-quiet'),
    );
    (nav.firstChild as HTMLButtonElement).disabled = k === 0;

    // the steps so far, as a table
    steps.replaceChildren();
    if (k > 0) {
      const wrap = h('div', { class: 'ml-table', tabindex: '0', role: 'region', 'aria-label': 'Βήματα υπολογισμού' });
      const t = h('table');
      t.append(h('caption', {}, 'Βήματα υπολογισμού (από τα φύλλα προς τη ρίζα)'));
      const head = h('tr');
      ['Κόμβος', 'Τελεστής', 'Πράξη'].forEach((c) => head.append(h('th', { scope: 'col' }, c)));
      t.append(head);
      r.steps.slice(0, k).forEach((s) => {
        const tr = h('tr');
        tr.append(h('td', {}, s.label), h('td', {}, s.gate), h('td', { class: 'sec-mono' }, s.formula));
        t.append(tr);
      });
      wrap.append(t);
      steps.append(wrap);
    }

    compare.textContent = baseline === null
      ? 'Συμβουλή: πάτησε «Κράτα ως πριν», μετά μείωσε μια τιμή (π.χ. spear phishing από 0,30 σε 0,05 με MFA) για να δεις πριν/μετά.'
      : `Πριν: ${show(baseline, mode)} · Τώρα: ${show(r.value, mode)}${k < r.steps.length ? ' (η τρέχουσα τιμή υπολογίζεται και πριν ολοκληρώσεις τα βήματα)' : ''}.`;
  }

  restart();
}
