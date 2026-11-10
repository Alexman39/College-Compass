/**
 * Extended Euclid / Bézout Stepper (CN6003 Week 3): the divisions, then the
 * back-substitution, then a·x + b·y = gcd and the inverse when gcd = 1.
 * Preset: 77 and 2592 (d = 101). Prev / Next / Reset walk the lines.
 * The «Find the trio» numbers (47, 2400) are refused: graded exercise.
 * Logic: src/lib/crypto-lab.ts (tested).
 */
import { bezout, isFindTheTrioEuclid, mod } from '~/lib/crypto-lab';
import { button, card, h } from './ml-ui';
import './sec.css';

const uid = () => Math.random().toString(36).slice(2, 7);

export function mount(root: HTMLElement): void {
  card(root, 'Extended Euclid / Bézout Stepper', 'Δώσε το e και το modulus (π.χ. φ(N)). Πρώτα οι διαιρέσεις μέχρι υπόλοιπο 0, μετά η ανάστροφη αντικατάσταση, μέχρι τη μορφή x·a + y·b = ΜΚΔ.');
  let a = 77, m = 2592, k = 0;

  const row = h('div', { class: 'ml-row' });
  const mk = (label: string, v: number, set: (n: number) => void) => {
    const id = `eu-${uid()}`;
    const input = h('input', { type: 'number', id, min: '1', step: '1', value: String(v) }) as HTMLInputElement;
    input.addEventListener('change', () => { set(Number(input.value)); k = 0; render(); });
    row.append(h('label', { for: id }, label), input);
  };
  mk('e (a)', a, (n) => (a = n));
  mk('modulus (b)', m, (n) => (m = n));
  const err = h('p', { class: 'ml-fb bad', 'aria-live': 'polite' });
  const list = h('ol', { class: 'sec-steps sec-mono', 'aria-label': 'Βήματα' });
  const nav = h('div', { class: 'ml-row' });
  const result = h('p', { class: 'ml-fb', 'aria-live': 'polite' });
  root.append(row, err, list, nav, result);

  function render() {
    err.hidden = true; result.hidden = true; list.replaceChildren(); nav.replaceChildren();
    if (![a, m].every((v) => Number.isInteger(v) && v > 0)) {
      err.hidden = false; err.textContent = 'Και οι δύο αριθμοί πρέπει να είναι θετικοί ακέραιοι.'; return;
    }
    if (isFindTheTrioEuclid(a, m)) {
      err.hidden = false;
      err.textContent = 'Αυτοί είναι οι αριθμοί της άσκησης «Find the trio» (e = 47, φ(N) = 2400). Λύσε την με το χέρι, όπως ζητά ο καθηγητής· δοκίμασε εδώ το παράδειγμα 77 και 2592.';
      return;
    }
    const b = bezout(a, m);
    const lines = [
      ...b.divisions.map((d) => `${d.a} = ${d.q}×${d.b} + ${d.r}`),
      ...(b.gcd === 1 ? b.lines : []),
    ];
    const nDiv = b.divisions.length;
    if (k > lines.length) k = lines.length;
    lines.slice(0, k).forEach((l, i) => {
      const li = h('li', i === k - 1 ? { class: 'on' } : {}, l);
      list.append(li);
    });
    nav.append(
      button('Προηγούμενο', () => { k = Math.max(0, k - 1); render(); }),
      button(k < nDiv ? 'Επόμενη διαίρεση' : 'Επόμενο βήμα', () => { k = Math.min(lines.length, k + 1); render(); }, 'primary'),
      button('Όλα', () => { k = lines.length; render(); }, 'ml-quiet'),
      button('Από την αρχή', () => { k = 0; render(); }, 'ml-quiet'),
    );
    (nav.children[0] as HTMLButtonElement).disabled = k === 0;
    (nav.children[1] as HTMLButtonElement).disabled = k === lines.length;

    if (k === 0) {
      result.hidden = false; result.className = 'ml-fb';
      result.textContent = `Ξεκινάμε: διαιρούμε το ${b.big} με το ${b.small}.`;
    } else if (k === nDiv && b.gcd !== 1) {
      result.hidden = false; result.className = 'ml-fb bad';
      result.textContent = `Τελευταίο μη μηδενικό υπόλοιπο: ΜΚΔ(${a}, ${m}) = ${b.gcd} ≠ 1. Δεν υπάρχει αντίστροφος· στον RSA αυτό το e δεν επιτρέπεται.`;
    } else if (k === nDiv) {
      result.hidden = false; result.className = 'ml-fb';
      result.textContent = `ΜΚΔ = 1 (το τελευταίο μη μηδενικό υπόλοιπο). Τώρα ανάστροφη αντικατάσταση, από το υπόλοιπο 1 προς τα πάνω.`;
    } else if (k === lines.length && b.gcd === 1) {
      const coefA = b.big === a ? b.x : b.y;
      const coefM = b.big === a ? b.y : b.x;
      const inv = mod(coefA, m);
      result.hidden = false; result.className = 'ml-fb ok';
      result.textContent = `Bézout: ${String(coefA).replace("-", "−")}×${a} + (${String(coefM).replace("-", "−")})×${m} = 1, άρα ${a}×${coefA} ≡ 1 (mod ${m}). Αντίστροφος: ${coefA}${coefA < 0 ? ` + ${m} = ${inv}` : ''} → d = ${inv}. Έλεγχος: ${a}×${inv} = ${a * inv} = ${Math.floor((a * inv) / m)}×${m} + ${(a * inv) % m}.`;
    }
  }

  render();
}
