/**
 * Preprocessing Lab (CN6005 Week 5, priority 2): a small e-shop table with a
 * duplicate, a $ amount, an impossible age and a gap. Each step (cleaning,
 * integration, one-hot, min-max, z-score) is predicted, run and explained,
 * with the changed cells highlighted and a history. A switch learns the
 * parameters from all rows instead of the training rows: data leakage.
 * Logic: src/lib/ml-lab.ts (tested).
 */
import { run, STEPS, USD_TO_EUR, type LabState, type StepId } from '~/lib/ml-lab';
import { button, card, h, num, predictBox } from './ml-ui';

interface Meta { name: string; q: (leak: boolean, s: LabState) => [string, string[], string, string] }

const META: Record<StepId, Meta> = {
  dedupe: { name: '1. Διπλότυπα (cleaning)', q: () => ['πόσες γραμμές μένουν αφού σβήσουμε τα διπλότυπα;', ['6', '7', '8'], '7', 'Ο πελάτης C εμφανίζεται δύο φορές με ακριβώς ίδια στοιχεία· κρατάμε μία.'] },
  currency: { name: '2. Ενοποίηση νομίσματος (integration)', q: () => ['πόσα € γίνεται το Σύνολο του D (110 $);', ['99', '110', '122,22'], '99', `Με την υποθετική ισοτιμία του παραδείγματος, 1 $ = ${num(USD_TO_EUR)} €: 110 · ${num(USD_TO_EUR)} = 99. Μετά η στήλη «Νόμισμα» δεν χρειάζεται.`] },
  outlier: { name: '3. Ακραίες τιμές (cleaning)', q: () => ['τι κάνουμε με την ηλικία 140 του E;', ['την κάνουμε κενή τιμή', 'τη διαιρούμε με 10', 'σβήνουμε τον πελάτη'], 'την κάνουμε κενή τιμή', 'Ηλικία 140 είναι αδύνατη: λάθος καταχώρισης. Τα υπόλοιπα στοιχεία του E είναι χρήσιμα, οπότε κρατάμε τη γραμμή και αντιμετωπίζουμε την ηλικία ως κενή.'] },
  impute: { name: '4. Κενές τιμές (cleaning)', q: (leak) => ['με ποια τιμή συμπληρώνονται οι κενές ηλικίες του B και του E (μέσος όρος);', ['30', '31,2', '31,5', '53,2'], leak ? '31,2' : '31,5', leak ? 'Με τον διακόπτη leakage ο μέσος όρος υπολογίζεται και με τον G των δεδομένων ελέγχου: (22 + 28 + 41 + 35 + 30) / 5 = 31,2. Λάθος: ο G δεν θα έπρεπε να επηρεάζει την εκπαίδευση.' : 'Μέσος όρος των γνωστών ηλικιών των δεδομένων εκπαίδευσης: (22 + 28 + 41 + 35) / 4 = 31,5. Ο G (δεδομένα ελέγχου) δεν μετρά.'] },
  onehot: { name: '5. One-hot encoding (transformation)', q: () => ['πόσες νέες στήλες 0/1 δίνει η Πόλη;', ['1', '3', '4'], '3', 'Μία στήλη για κάθε πόλη (Αθήνα, Θεσσαλονίκη, Πάτρα). Έτσι δεν δημιουργείται ψευδής σειρά, όπως αν γράφαμε Αθήνα = 1, Θεσσαλονίκη = 2, Πάτρα = 3.'] },
  minmax: { name: '6. Min-max στο Σύνολο (transformation)', q: (leak) => ['σε ποια τιμή πάει το Σύνολο του G (520 €, δεδομένα ελέγχου);', ['0,9', '1', '1,14'], leak ? '1' : '1,14', leak ? 'Με leakage το max υπολογίζεται και με τον G (520), οπότε ο G «χωράει» ακριβώς στο 1. Η εικόνα είναι πιο ωραία αλλά ψεύτικη.' : 'Τα min = 45 και max = 460 μαθαίνονται μόνο από τα δεδομένα εκπαίδευσης: (520 − 45) / (460 − 45) ≈ 1,14. Μια τιμή ελέγχου εκτός [0, 1] είναι αναμενόμενη και σωστή.'] },
  zscore: { name: '7. Z-score στην ηλικία (transformation)', q: () => ['τι πρόσημο θα έχει το z του A (22 ετών);', ['αρνητικό', 'μηδέν', 'θετικό'], 'αρνητικό', 'Ο A είναι νεότερος από τον μέσο όρο (31,5), άρα z = (22 − 31,5) / σ < 0. Το z μετρά πόσες τυπικές αποκλίσεις απέχει μια τιμή από τον μέσο όρο.'] },
};

const show = (v: string | number | null | undefined) => (v === null || v === undefined ? '— (κενό)' : typeof v === 'number' ? num(v, 2) : v);

export function mount(root: HTMLElement): void {
  let done: StepId[] = [];
  let leak = false;
  let pending = false;
  card(root, 'Preprocessing Lab', 'Ένας μικρός πίνακας πελατών με τα συνηθισμένα προβλήματα: ένα διπλότυπο, ένα ποσό σε δολάρια, μια αδύνατη ηλικία και ένα κενό. Οι γραμμές A–F είναι δεδομένα εκπαίδευσης· η G (σε πλάγια) είναι δεδομένα ελέγχου. Τα δεδομένα είναι δικά μας, ενδεικτικά.');

  const leakLabel = h('label');
  const leakBox = h('input', { type: 'checkbox' });
  leakLabel.append(leakBox, document.createTextNode('Υπολόγισε τις παραμέτρους σε όλες τις γραμμές (λάθος: data leakage)'));
  const warn = h('p', { class: 'ml-warn' });
  const step = h('div');
  const actions = h('div', { class: 'ml-row' });
  const tableWrap = h('div');
  const params = h('p', { class: 'ml-note' });
  const histTitle = h('p', { class: 'ml-q' }, 'Ιστορικό αλλαγών');
  const hist = h('ol', { class: 'ml-history' });
  root.append(leakLabel, warn, step, actions, tableWrap, params, histTitle, hist);

  leakBox.addEventListener('change', () => { leak = leakBox.checked; pending = false; render(); });

  function render() {
    const prev = run(done.slice(0, -1), leak);
    const cur = run(done, leak);
    warn.hidden = !leak;
    warn.textContent = 'Προσοχή: με αυτόν τον διακόπτη, ο μέσος όρος, το min/max και η σ υπολογίζονται και από τη γραμμή G των δεδομένων ελέγχου. Η αξιολόγηση θα φαινόταν τεχνητά καλύτερη.';

    step.replaceChildren();
    actions.replaceChildren();
    const next = STEPS[done.length];
    if (next) {
      const [q, opts, ans, why] = META[next].q(leak, cur);
      step.append(h('p', { class: 'ml-q' }, `Επόμενο βήμα: ${META[next].name}`));
      if (!pending) step.append(predictBox(q, opts, ans, why, () => { pending = true; actions.replaceChildren(runBtn(next), ...common()); }));
      actions.append(...(pending ? [runBtn(next)] : []), ...common());
    } else {
      step.append(h('p', { class: 'ml-q' }, 'Τέλος: τα δεδομένα είναι έτοιμα για ένα μοντέλο. Όλες οι στήλες είναι αριθμοί σε συγκρίσιμη κλίμακα.'));
      actions.append(...common());
    }

    // table, with the cells this step changed highlighted
    const t = h('table');
    const trh = h('tr');
    ['Πελάτης', ...cur.columns].forEach((c) => trh.append(h('th', { scope: 'col' }, c)));
    const thead = h('thead'); thead.append(trh);
    const tbody = h('tbody');
    cur.rows.forEach((r, i) => {
      const tr = h('tr', r.split === 'test' ? { class: 'test' } : {});
      tr.append(h('td', {}, `${r.id}${r.split === 'test' ? ' (έλεγχος)' : ''}`));
      const before = prev.rows.find((p, j) => p.id === r.id && (j === i || prev.rows.filter((q) => q.id === r.id).length === 1));
      for (const c of cur.columns) {
        const changed = done.length > 0 && (!before || before.cells[c] !== r.cells[c]);
        tr.append(h('td', changed ? { class: 'changed' } : {}, show(r.cells[c])));
      }
      tbody.append(tr);
    });
    t.append(thead, tbody);
    const wrap = h('div', { class: 'ml-table', tabindex: '0', role: 'region', 'aria-label': 'Ο πίνακας μετά τα βήματα' });
    wrap.append(t);
    tableWrap.replaceChildren(wrap);

    const p = cur.params;
    const parts: string[] = [];
    if (p.ageMean !== undefined) parts.push(`μέσος όρος ηλικίας για συμπλήρωση ${num(p.ageMean)}`);
    if (p.totalMin !== undefined) parts.push(`min/max Συνόλου ${num(p.totalMin)} / ${num(p.totalMax!)}`);
    if (p.ageMu !== undefined) parts.push(`μ = ${num(p.ageMu)}, σ = ${num(p.ageSigma!)} για το z-score`);
    params.hidden = !parts.length;
    params.textContent = `Παράμετροι που «έμαθε» η προεπεξεργασία (από ${leak ? 'όλες τις γραμμές: leakage' : 'τα δεδομένα εκπαίδευσης μόνο'}): ${parts.join(' · ')}.`;

    hist.replaceChildren(...(done.length ? done.map((d) => h('li', {}, META[d].name.replace(/^\d+\.\s*/, ''))) : [h('li', {}, 'Τίποτα ακόμα: ο αρχικός πίνακας.')]));
  }

  function runBtn(next: StepId) {
    return button(`Εκτέλεσε: ${META[next].name}`, () => { done = [...done, next]; pending = false; render(); }, 'primary');
  }

  function common() {
    return [
      button('← Αναίρεση', () => { done = done.slice(0, -1); pending = false; render(); }),
      button('↺ Από την αρχή', () => { done = []; pending = false; render(); }),
    ].map((b) => { if (!done.length) b.setAttribute('disabled', ''); return b; });
  }

  render();
}
