/**
 * Packet Anatomy Explorer (CN6003 Week 4): the book's ping request/reply,
 * byte for byte. Click a byte to light its field, or a field to light its
 * bytes; the panel decodes and explains it (IHL × 4, lengths, addresses,
 * checksums recomputed). Data and checks: src/lib/packet-lab.ts (tested).
 */
import { PING_REPLY, PING_REQUEST, fields, type Field } from '~/lib/packet-lab';
import { button, card, h, predictBox } from './ml-ui';
import './sec.css';

const LAYER_TAG: Record<string, string> = { Ethernet: 'ETH', IPv4: 'IP', ICMP: 'ICMP', Δεδομένα: 'DATA', FCS: 'FCS' };

export function mount(root: HTMLElement): void {
  card(root, 'Packet Anatomy Explorer', 'Το λυμένο παράδειγμα του βιβλίου: ένα ping (ICMP echo) σε πλαίσιο Ethernet. Πάτησε ένα byte ή ένα πεδίο.');
  let reply = false;
  let sel = 0;

  const which = h('div', { class: 'ml-row', role: 'group', 'aria-label': 'Πακέτο' });
  const bytesBox = h('div', { class: 'sec-grid', 'aria-label': 'Bytes σε δεκαεξαδική μορφή' });
  const detail = h('div', { class: 'ml-predict', 'aria-live': 'polite' });
  const tree = h('ol', { class: 'sec-steps', 'aria-label': 'Τα πεδία ανά επίπεδο' });
  const quiz = h('div');
  quiz.append(predictBox('πόσα bytes δεδομένων μεταφέρει το ICMP σε αυτό το ping;', ['32', '60', '74'], '32',
    'Total Length 60 − 20 (επικεφαλίδα IPv4) − 8 (επικεφαλίδα ICMP) = 32. Το 74 είναι το πλαίσιο χωρίς FCS.', () => {}));
  root.append(which, bytesBox, detail, tree, quiz,
    h('p', { class: 'ml-note' }, 'Πραγματικό δείγμα από το βιβλίο (Χειλάς, Πολίτης, Βακαλούδη, κεφ. 3), όχι δική σου καταγραφή. Τα checksums και το CRC ξαναϋπολογίζονται εδώ.'));

  function render() {
    const frame = reply ? PING_REPLY : PING_REQUEST;
    const fs = fields(frame);
    const f: Field = fs[sel]!;
    which.replaceChildren(...[['Echo request', false], ['Echo reply', true]].map(([l, r]) => {
      const b = button(l as string, () => { reply = r as boolean; render(); });
      b.setAttribute('aria-pressed', String(reply === r));
      return b;
    }));

    bytesBox.replaceChildren();
    frame.forEach((byte, i) => {
      const fi = fs.findIndex((x) => i >= x.start && i < x.start + x.len);
      const b = h('button', { type: 'button', class: 'sec-cell', 'aria-label': `Byte ${i}: 0x${byte.toString(16).padStart(2, '0')}, ${fs[fi]!.name}` });
      b.setAttribute('aria-pressed', String(fi === sel));
      b.append(h('span', {}, byte.toString(16).padStart(2, '0')), h('small', {}, LAYER_TAG[fs[fi]!.layer]!));
      b.addEventListener('click', () => { sel = fi; render(); });
      bytesBox.append(b);
    });

    detail.replaceChildren(
      h('p', { class: 'ml-q' }, `${f.layer} · ${f.name} · bytes ${f.start}–${f.start + f.len - 1} (${f.len} byte${f.len > 1 ? 's' : ''})`),
      h('p', { class: 'sec-mono' }, f.value(frame)),
      h('p', {}, f.explain),
    );

    tree.replaceChildren();
    fs.forEach((x, i) => {
      const li = h('li', i === sel ? { class: 'on' } : {});
      const b = button(`${x.layer}: ${x.name}`, () => { sel = i; render(); });
      b.setAttribute('aria-pressed', String(i === sel));
      li.append(b, h('span', { class: 'sec-mono' }, ` ${x.value(frame)}`));
      tree.append(li);
    });
  }

  render();
}
