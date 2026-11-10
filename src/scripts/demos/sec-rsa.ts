/**
 * RSA Key Generation Explorer (CN6003 Week 3, textbook RSA, teaching only):
 * small primes p, q → N, φ(N); e with gcd(e, φ) = 1; d from Euclid; then
 * C = P^e mod N and back, with every square-and-multiply step (BigInt).
 * Preset: the lecture's p = 37, q = 73, e = 77, P = 812 («IM»).
 * Refuses the «Find the trio» exercise numbers (p = 41, q = 61, e = 47).
 * Logic: src/lib/crypto-lab.ts (tested).
 */
import { modPow, rsaKeys, type RsaError } from '~/lib/crypto-lab';
import { button, card, h } from './ml-ui';
import './sec.css';

const uid = () => Math.random().toString(36).slice(2, 7);

const ERR: Record<RsaError, string> = {
  'p-not-prime': 'Το p δεν είναι πρώτος αριθμός.',
  'q-not-prime': 'Το q δεν είναι πρώτος αριθμός.',
  'p-equals-q': 'Τα p και q πρέπει να είναι διαφορετικά.',
  'e-range': 'Το e πρέπει να είναι ακέραιος με 1 < e < φ(N).',
  'e-not-coprime': 'Το e έχει κοινό διαιρέτη με το φ(N) (ΜΚΔ ≠ 1), άρα δεν έχει αντίστροφο. Διάλεξε άλλο e.',
  'P-range': 'Το μήνυμα P πρέπει να είναι ακέραιος με 0 ≤ P < N.',
  exercise: 'Αυτά είναι τα δεδομένα της άσκησης «Find the trio» (p = 41, q = 61, e = 47). Λύσε την με το χέρι, με τον Ευκλείδη και την ταυτότητα Bézout· εδώ δοκίμασε το παράδειγμα της διάλεξης ή δικούς σου αριθμούς.',
};

export function mount(root: HTMLElement): void {
  card(root, 'RSA Key Generation Explorer', 'Μικρά, εκπαιδευτικά p και q. Η εφαρμογή ελέγχει κάθε τιμή και δείχνει τις πράξεις βήμα προς βήμα.');
  const vals = { p: 37, q: 73, e: 77, P: 812 };
  let showSteps: 'enc' | 'dec' | null = null;

  const row = h('div', { class: 'ml-row' });
  for (const [k, label] of [['p', 'p (πρώτος)'], ['q', 'q (πρώτος)'], ['e', 'e'], ['P', 'μήνυμα P']] as const) {
    const id = `rsa-${k}-${uid()}`;
    const input = h('input', { type: 'number', id, min: '0', step: '1', value: String(vals[k]) }) as HTMLInputElement;
    input.addEventListener('change', () => { vals[k] = Number(input.value); showSteps = null; render(); });
    row.append(h('label', { for: id }, label), input);
  }
  const warn = h('p', { class: 'ml-warn' }, 'Εκπαιδευτικό, μη ασφαλές για πραγματική χρήση: textbook RSA, χωρίς padding και με μικρούς αριθμούς. Στην πράξη χρησιμοποιούνται RSA-OAEP (κρυπτογράφηση) και RSA-PSS (υπογραφές), με κλειδιά τουλάχιστον 2048 bit και ελεγμένες βιβλιοθήκες.');
  const err = h('p', { class: 'ml-fb bad', 'aria-live': 'polite' });
  const keys = h('ol', { class: 'sec-steps sec-mono' });
  const actions = h('div', { class: 'ml-row' });
  const steps = h('div');
  root.append(row, warn, err, keys, actions, steps);

  function render() {
    err.hidden = true; keys.replaceChildren(); actions.replaceChildren(); steps.replaceChildren();
    const { p, q, e, P } = vals;
    if (![p, q, e, P].every(Number.isInteger) || p > 10000 || q > 10000) {
      err.hidden = false; err.textContent = 'Δώσε ακέραιους· για να μένουν οι πράξεις αναγνώσιμες, p και q έως 10.000.'; return;
    }
    const k = rsaKeys(p, q, e);
    if ('error' in k) { err.hidden = false; err.textContent = ERR[k.error]; return; }
    const lines = [
      `N = p × q = ${p} × ${q} = ${k.N}`,
      `φ(N) = (p − 1)(q − 1) = ${p - 1} × ${q - 1} = ${k.phi}`,
      `ΜΚΔ(e, φ(N)) = ΜΚΔ(${e}, ${k.phi}) = 1 ✓`,
      `d: ${e} × d ≡ 1 (mod ${k.phi}) → d = ${k.d} (Ευκλείδης + Bézout· έλεγχος: ${e} × ${k.d} = ${e * k.d} = ${Math.floor((e * k.d) / k.phi)} × ${k.phi} + 1)`,
      `Δημόσιο κλειδί (e, N) = (${e}, ${k.N}) · ιδιωτικός εκθέτης d = ${k.d}`,
    ];
    lines.forEach((l) => keys.append(h('li', {}, l)));
    if (P < 0 || P >= k.N) { err.hidden = false; err.textContent = `${ERR['P-range']} Εδώ N = ${k.N}.`; return; }

    const enc = modPow(BigInt(P), BigInt(e), BigInt(k.N));
    const dec = modPow(enc.value, BigInt(k.d), BigInt(k.N));
    keys.append(
      h('li', {}, `Κρυπτογράφηση: C = P^e mod N = ${P}^${e} mod ${k.N} = ${enc.value}`),
      h('li', {}, `Αποκρυπτογράφηση: P = C^d mod N = ${enc.value}^${k.d} mod ${k.N} = ${dec.value}${dec.value === BigInt(P) ? ' ✓ (το αρχικό μήνυμα)' : ''}`),
    );
    const b1 = button('Βήματα κρυπτογράφησης', () => { showSteps = showSteps === 'enc' ? null : 'enc'; render(); });
    const b2 = button('Βήματα αποκρυπτογράφησης', () => { showSteps = showSteps === 'dec' ? null : 'dec'; render(); });
    b1.setAttribute('aria-pressed', String(showSteps === 'enc'));
    b2.setAttribute('aria-pressed', String(showSteps === 'dec'));
    actions.append(b1, b2);

    if (showSteps) {
      const [base, exp, run] = showSteps === 'enc' ? [BigInt(P), e, enc] : [enc.value, k.d, dec];
      const wrap = h('div', { class: 'ml-table', tabindex: '0', role: 'region', 'aria-label': 'Square-and-multiply' });
      const t = h('table');
      t.append(h('caption', {}, `${base}^${exp} mod ${k.N} με square-and-multiply: ο εκθέτης στο δυαδικό είναι ${exp.toString(2)}. Για κάθε bit: τετράγωνο, και αν το bit είναι 1, επί ${base}. Κρατάμε πάντα μόνο το υπόλοιπο.`));
      const head = h('tr');
      ['Bit', 'r² mod N', `× ${base} mod N (αν bit = 1)`, 'r'].forEach((c) => head.append(h('th', { scope: 'col' }, c)));
      t.append(head);
      for (const s of run.steps) {
        const tr = h('tr');
        tr.append(h('td', {}, s.bit), h('td', {}, String(s.square)), h('td', {}, s.multiply === undefined ? '—' : String(s.multiply)), h('td', {}, String(s.result)));
        t.append(tr);
      }
      wrap.append(t);
      steps.append(wrap);
    }
  }

  render();
}
