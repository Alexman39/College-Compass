/**
 * LSB Pixel Explorer (CN6003 Week 3): an RGB pixel in 8-bit binary, three
 * message bits written into the least significant bits, before/after values,
 * the extracted bits, and a capacity calculator. Preset: the lecture's
 * pixel (91, 62, 95) with bits 0, 1, 0. Logic: src/lib/crypto-lab.ts (tested).
 */
import { bin8, capacity, lsbEmbed, lsbExtract } from '~/lib/crypto-lab';
import { button, card, h } from './ml-ui';
import './sec.css';

const uid = () => Math.random().toString(36).slice(2, 7);
const CH = ['R', 'G', 'B'] as const;
const bitsHtml = (v: number) => {
  const s = bin8(v);
  const span = h('span', { class: 'sec-mono sec-bits' }, s.slice(0, 7));
  span.append(h('b', {}, s[7]!));
  return span;
};

export function mount(root: HTMLElement): void {
  card(root, 'LSB Pixel Explorer', 'Κάθε κανάλι έχει 8 bit (0–255). Το τελευταίο, λιγότερο σημαντικό bit (LSB) αλλάζει την τιμή το πολύ κατά 1.');
  const pixel: [number, number, number] = [91, 62, 95];
  const bits: [0 | 1, 0 | 1, 0 | 1] = [0, 1, 0];
  let w = 1024, hgt = 768, bpc = 1;

  const pRow = h('div', { class: 'ml-row' });
  CH.forEach((c, i) => {
    const id = `lsb-${c}-${uid()}`;
    const input = h('input', { type: 'number', id, min: '0', max: '255', step: '1', value: String(pixel[i]) }) as HTMLInputElement;
    input.addEventListener('change', () => { pixel[i] = Number(input.value); render(); });
    pRow.append(h('label', { for: id }, c), input);
  });
  const bRow = h('div', { class: 'ml-row', role: 'group', 'aria-label': 'Bit μηνύματος' });
  const err = h('p', { class: 'ml-fb bad', 'aria-live': 'polite' });
  const tableBox = h('div', { 'aria-live': 'polite' });
  const swatches = h('div', { class: 'ml-row' });
  const capRow = h('div', { class: 'ml-row' });
  const capOut = h('p', { class: 'ml-fb', 'aria-live': 'polite' });
  root.append(pRow, bRow, err, tableBox, swatches, h('p', { class: 'ml-q' }, 'Χωρητικότητα εικόνας'), capRow, capOut,
    h('p', { class: 'ml-warn' }, 'Η απλή LSB στεγανογραφία δεν είναι κρυπτογράφηση: ανιχνεύεται στατιστικά και χάνεται με επανασυμπίεση, αλλαγή μεγέθους ή μετατροπή της εικόνας.'));

  for (const [label, val, set, max] of [['Πλάτος', w, (n: number) => (w = n), 20000], ['Ύψος', hgt, (n: number) => (hgt = n), 20000], ['bit ανά κανάλι', bpc, (n: number) => (bpc = n), 3]] as const) {
    const id = `cap-${uid()}`;
    const input = h('input', { type: 'number', id, min: '1', max: String(max), step: '1', value: String(val) }) as HTMLInputElement;
    input.addEventListener('change', () => { set(Number(input.value)); render(); });
    capRow.append(h('label', { for: id }, label), input);
  }

  function render() {
    bRow.replaceChildren(h('span', { class: 'ml-q' }, 'Bit μηνύματος:'));
    CH.forEach((c, i) => {
      const b = button(`${c}: ${bits[i]}`, () => { bits[i] = bits[i] ? 0 : 1; render(); });
      b.setAttribute('aria-label', `Bit για το κανάλι ${c}: ${bits[i]}. Πάτησε για αλλαγή.`);
      bRow.append(b);
    });
    err.hidden = true; tableBox.replaceChildren(); swatches.replaceChildren();
    if (!pixel.every((v) => Number.isInteger(v) && v >= 0 && v <= 255)) {
      err.hidden = false; err.textContent = 'Οι τιμές των καναλιών είναι ακέραιοι από 0 έως 255.';
    } else {
      const after = lsbEmbed(pixel, bits);
      const wrap = h('div', { class: 'ml-table', tabindex: '0', role: 'region', 'aria-label': 'Πριν και μετά' });
      const t = h('table');
      t.append(h('caption', {}, `Το pixel (${pixel.join(', ')}) γίνεται (${after.join(', ')}) και μεταφέρει τα bit ${lsbExtract(after).join('')}.`));
      const head = h('tr');
      ['Κανάλι', 'Πριν', 'Δυαδικό', 'Bit', 'Μετά', 'Δυαδικό', 'Διαφορά'].forEach((c) => head.append(h('th', { scope: 'col' }, c)));
      t.append(head);
      CH.forEach((c, i) => {
        const tr = h('tr');
        const td1 = h('td'); td1.append(bitsHtml(pixel[i]!));
        const td2 = h('td'); td2.append(bitsHtml(after[i]!));
        const diff = after[i]! - pixel[i]!;
        tr.append(h('td', {}, c), h('td', {}, String(pixel[i])), td1, h('td', {}, String(bits[i])), h('td', {}, String(after[i])), td2, h('td', {}, diff === 0 ? '0' : diff > 0 ? `+${diff}` : `−${-diff}`));
        t.append(tr);
      });
      wrap.append(t);
      tableBox.append(wrap);
      const sw = (rgb: number[], label: string) => {
        const box = h('div', { class: 'ml-row' });
        box.append(h('span', { style: `display:inline-block;width:3rem;height:2rem;border-radius:6px;border:1px solid var(--divider);background:rgb(${rgb.join(',')})`, 'aria-hidden': 'true' }), h('span', {}, label));
        return box;
      };
      swatches.append(sw(pixel, `πριν (${pixel.join(', ')})`), sw(after, `μετά (${after.join(', ')}): το μάτι δεν βλέπει διαφορά`));
    }

    if (![w, hgt].every((v) => Number.isInteger(v) && v > 0) || ![1, 2, 3].includes(bpc)) {
      capOut.className = 'ml-fb bad'; capOut.textContent = 'Πλάτος και ύψος θετικοί ακέραιοι· 1 έως 3 bit ανά κανάλι.';
    } else {
      const c = capacity(w, hgt, bpc);
      const n = (v: number) => v.toLocaleString('el-GR', { maximumFractionDigits: 2 });
      capOut.className = 'ml-fb';
      capOut.textContent = `${n(w)} × ${n(hgt)} × 3 κανάλια × ${bpc} bit = ${n(c.bits)} bit = ${n(c.bytes)} bytes = ${n(c.kib)} KiB (θεωρητικά, χωρίς metadata).${bpc > 1 ? ' Με περισσότερα bit ανά κανάλι οι αλλοιώσεις γίνονται πιο ορατές.' : ''}`;
    }
  }

  render();
}
