/**
 * IPv4 Fragmentation Calculator (CN6003 Week 4): payload, link MTU and DF →
 * the fragments with Total Length, Offset (units of 8 bytes) and MF.
 * Preset: the lesson's worked example, 2.000 bytes over MTU 1.500.
 * Logic: src/lib/packet-lab.ts (tested).
 */
import { fragment } from '~/lib/packet-lab';
import { card, h } from './ml-ui';
import './sec.css';

const uid = () => Math.random().toString(36).slice(2, 7);

export function mount(root: HTMLElement): void {
  card(root, 'Fragmentation Calculator', 'Επικεφαλίδα IPv4 20 bytes, χωρίς options. Κάθε fragment εκτός από το τελευταίο μεταφέρει πολλαπλάσιο των 8 bytes.');
  let payload = 2000, mtu = 1500, df = false;
  const row = h('div', { class: 'ml-row' });
  for (const [label, get, set, min] of [['Δεδομένα (bytes)', () => payload, (n: number) => (payload = n), 1], ['MTU ζεύξης', () => mtu, (n: number) => (mtu = n), 68]] as const) {
    const id = `fr-${uid()}`;
    const input = h('input', { type: 'number', id, min: String(min), max: '65515', step: '1', value: String(get()) }) as HTMLInputElement;
    input.addEventListener('change', () => { set(Number(input.value)); render(); });
    row.append(h('label', { for: id }, label), input);
  }
  const dfId = `df-${uid()}`;
  const cb = h('input', { type: 'checkbox', id: dfId }) as HTMLInputElement;
  cb.addEventListener('change', () => { df = cb.checked; render(); });
  const lab = h('label', { for: dfId }, 'DF (Don’t Fragment)');
  lab.prepend(cb);
  row.append(lab);
  const out = h('div', { 'aria-live': 'polite' });
  root.append(row, out);

  function render() {
    out.replaceChildren();
    if (!Number.isInteger(payload) || payload < 1 || payload > 65515 || !Number.isInteger(mtu)) {
      out.append(h('p', { class: 'ml-fb bad' }, 'Δεδομένα: ακέραιος 1–65.515 bytes (το Total Length έχει 16 bit). MTU: ακέραιος.')); return;
    }
    const r = fragment(payload, mtu, df);
    if ('error' in r) {
      out.append(h('p', { class: 'ml-fb bad' }, r.error === 'mtu'
        ? 'Το IPv4 απαιτεί MTU τουλάχιστον 68 bytes.'
        : `Το datagram (${payload + 20} bytes) δεν χωρά στο MTU ${mtu} και το DF απαγορεύει τον κατακερματισμό: ο δρομολογητής το απορρίπτει και ενδέχεται να στείλει ICMP «Destination unreachable – fragmentation needed». Έτσι λειτουργεί το Path MTU Discovery.`));
      return;
    }
    const wrap = h('div', { class: 'ml-table', tabindex: '0', role: 'region', 'aria-label': 'Fragments' });
    const t = h('table');
    const max = Math.floor((mtu - 20) / 8) * 8;
    t.append(h('caption', {}, r.fragments.length === 1 ? 'Χωρά ολόκληρο: δεν χρειάζεται κατακερματισμός.' : `Μέγιστα δεδομένα ανά fragment: ⌊(${mtu} − 20) / 8⌋ × 8 = ${max} bytes. Όλα έχουν την ίδια Identification.`));
    const head = h('tr');
    ['#', 'Δεδομένα', 'Total Length', 'Offset (× 8 = bytes)', 'MF'].forEach((c) => head.append(h('th', { scope: 'col' }, c)));
    t.append(head);
    for (const f of r.fragments) {
      const tr = h('tr');
      tr.append(h('td', {}, String(f.index + 1)), h('td', {}, String(f.payload)), h('td', {}, String(f.totalLength)), h('td', {}, `${f.offset} (${f.offset * 8})`), h('td', {}, String(f.mf)));
      t.append(tr);
    }
    wrap.append(t);
    out.append(wrap, h('p', { class: 'ml-note' }, 'Η επανασυναρμολόγηση γίνεται στον τελικό προορισμό. Το Fragment Offset έχει 13 bit: μέγιστη τιμή 8191, δηλαδή 65.528 bytes.'));
  }

  render();
}
