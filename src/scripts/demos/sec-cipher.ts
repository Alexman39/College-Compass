/**
 * Two CN6003 Week 3 letter-by-letter labs in one module:
 *  - sec-caesar: Caesar / shift cipher, K 0–25, encrypt or decrypt, with an
 *    optional brute force over all 26 keys;
 *  - sec-vigenere: Vigenère with a repeating key word.
 * A strip of cells shows letter → number → ± shift → mod 26 → letter; Prev /
 * Next walk through the letters and explain the current one. The lecture's
 * Vigenère exercise («gold») is not computed, so it stays an exercise.
 * Logic: src/lib/crypto-lab.ts (tested).
 */
import { bruteForce, caesar, isGoldExercise, joinOut, vigenere, type CharStep } from '~/lib/crypto-lab';
import { button, card, h } from './ml-ui';
import './sec.css';

const uid = () => Math.random().toString(36).slice(2, 7);

export function mount(root: HTMLElement): void {
  const vig = root.dataset.demo === 'sec-vigenere';
  card(root, vig ? 'Vigenère Visualizer' : 'Caesar Cipher Playground', vig
    ? 'Κάθε γράμμα του κλειδιού ορίζει μια μετατόπιση· το κλειδί επαναλαμβάνεται κυκλικά, μόνο πάνω στα γράμματα. Κενά και σημεία στίξης μένουν ως έχουν.'
    : 'Αλφάβητο A = 0 … Z = 25. Κρυπτογράφηση: (x + K) mod 26 · αποκρυπτογράφηση: (x − K) mod 26. Τα γράμματα που «τυλίγονται» μετά το Z σημειώνονται.');

  let text = vig ? 'CAT' : 'CAT';
  let key = vig ? 'KEY' : '3';
  let decrypt = false;
  let pos = 0;
  let brute = false;

  const tId = `t-${uid()}`, kId = `k-${uid()}`;
  const inputs = h('div', { class: 'ml-row' });
  const tLab = h('label', { for: tId }, vig ? 'Κείμενο' : 'Κείμενο');
  const tIn = h('input', { type: 'text', id: tId, value: text, autocomplete: 'off', spellcheck: 'false' }) as HTMLInputElement;
  const kLab = h('label', { for: kId }, vig ? 'Κλειδί (λέξη)' : 'Κλειδί K (0–25)');
  const kIn = (vig
    ? h('input', { type: 'text', id: kId, value: key, autocomplete: 'off', spellcheck: 'false' })
    : h('input', { type: 'number', id: kId, min: '0', max: '25', step: '1', value: key })) as HTMLInputElement;
  inputs.append(tLab, tIn, kLab, kIn);
  const modeRow = h('div', { class: 'ml-row', role: 'group', 'aria-label': 'Λειτουργία' });
  const encB = button('Κρυπτογράφηση', () => { decrypt = false; pos = 0; render(); });
  const decB = button('Αποκρυπτογράφηση', () => { decrypt = true; pos = 0; render(); });
  modeRow.append(encB, decB);
  if (!vig) modeRow.append(button('Brute force: όλα τα κλειδιά', () => { brute = !brute; render(); }, 'ml-quiet'));
  const err = h('p', { class: 'ml-fb bad', 'aria-live': 'polite' });
  const out = h('p', { class: 'sec-case sec-mono', 'aria-live': 'polite' });
  const strip = h('div', { class: 'sec-grid', role: 'list', 'aria-label': 'Γράμμα προς γράμμα' });
  const nav = h('div', { class: 'ml-row' });
  const explain = h('p', { class: 'ml-note', 'aria-live': 'polite' });
  const bruteBox = h('div');
  root.append(inputs, modeRow, err, out, strip, nav, explain, bruteBox);

  tIn.addEventListener('input', () => { text = tIn.value; pos = 0; render(); });
  kIn.addEventListener('input', () => { key = kIn.value; pos = 0; render(); });

  function render() {
    encB.setAttribute('aria-pressed', String(!decrypt));
    decB.setAttribute('aria-pressed', String(decrypt));
    err.hidden = true;
    strip.replaceChildren(); nav.replaceChildren(); explain.textContent = ''; bruteBox.replaceChildren();

    let steps: CharStep[];
    try {
      if (vig && !decrypt && isGoldExercise(text, key)) {
        out.textContent = '—';
        err.hidden = false;
        err.textContent = 'Αυτή είναι η άσκηση της διάλεξης («proceed meeting as agreed» με κλειδί gold). Λύσε την με το χέρι· δοκίμασε εδώ άλλη φράση ή άλλο κλειδί για εξάσκηση.';
        return;
      }
      if (vig) steps = vigenere(text, key, decrypt);
      else {
        const k = Number(key);
        if (key.trim() === '' || !Number.isInteger(k) || k < 0 || k > 25) throw new RangeError();
        steps = caesar(text, k, decrypt);
      }
    } catch {
      out.textContent = '—';
      err.hidden = false;
      err.textContent = vig ? 'Το κλειδί χρειάζεται τουλάχιστον ένα λατινικό γράμμα.' : 'Το K πρέπει να είναι ακέραιος από 0 έως 25.';
      return;
    }
    out.textContent = `${decrypt ? 'Αρχικό κείμενο' : 'Κρυπτοκείμενο'}: ${joinOut(steps) || '—'}`;

    const letters = steps.map((s, i) => [s, i] as const).filter(([s]) => s.x !== undefined);
    if (pos >= letters.length) pos = Math.max(0, letters.length - 1);
    const cur = letters[pos];
    steps.forEach((s, i) => {
      const cell = h('div', { class: 'sec-cell', role: 'listitem' });
      if (s.x === undefined) { cell.append(h('span', {}, s.input === ' ' ? '␣' : s.input)); strip.append(cell); return; }
      if (cur && cur[1] === i) cell.classList.add('on');
      cell.append(
        h('span', {}, s.input),
        h('small', {}, String(s.x)),
        ...(vig ? [h('small', {}, s.keyLetter!)] : []),
        h('small', {}, `${decrypt ? '−' : '+'}${s.shift}${s.wrapped ? ' ↺' : ''}`),
        h('strong', {}, s.output),
      );
      strip.append(cell);
    });

    if (cur) {
      const s = cur[0];
      nav.append(
        button('Προηγούμενο', () => { pos = Math.max(0, pos - 1); render(); }),
        button('Επόμενο', () => { pos = Math.min(letters.length - 1, pos + 1); render(); }, 'primary'),
        button('Από την αρχή', () => { pos = 0; render(); }, 'ml-quiet'),
      );
      (nav.children[0] as HTMLButtonElement).disabled = pos === 0;
      (nav.children[1] as HTMLButtonElement).disabled = pos === letters.length - 1;
      const keyPart = vig ? `το γράμμα κλειδιού ${s.keyLetter} = ${s.shift}, άρα ` : '';
      const op = decrypt ? '−' : '+';
      explain.textContent = `Γράμμα ${pos + 1} από ${letters.length}: ${s.input.toUpperCase()} = ${s.x}· ${keyPart}(${s.x} ${op} ${s.shift}) mod 26 = ${s.raw} mod 26 = ${(s.output.toUpperCase().charCodeAt(0) - 65)} = ${s.output.toUpperCase()}${s.wrapped ? ' (τύλιγμα γύρω από το αλφάβητο)' : ''}.`;
    }

    if (!vig && brute) {
      const wrap = h('div', { class: 'ml-table', tabindex: '0', role: 'region', 'aria-label': 'Όλα τα κλειδιά' });
      const t = h('table');
      t.append(h('caption', {}, 'Brute force: αποκρυπτογράφηση του κειμένου με κάθε K. Ψάξε τη γραμμή που βγάζει νόημα.'));
      const head = h('tr');
      ['K', 'Αποκρυπτογράφηση'].forEach((c) => head.append(h('th', { scope: 'col' }, c)));
      t.append(head);
      for (const r of bruteForce(text)) {
        const tr = h('tr');
        tr.append(h('td', {}, String(r.key)), h('td', { class: 'sec-mono' }, r.text));
        t.append(tr);
      }
      wrap.append(t);
      bruteBox.append(wrap);
    }
  }

  render();
}
