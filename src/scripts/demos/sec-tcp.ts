/**
 * TCP Conversation Timeline (CN6003 Week 4): a synthetic HTTP/1.1 session
 * (SYN … cumulative ACK … FIN), one segment at a time, with flags, relative
 * Seq/Ack and payload. The student predicts each Ack before it is shown.
 * A switch shows what stays visible when the same session runs over HTTPS.
 * Data (checked): src/lib/packet-lab.ts.
 */
import { TCP_CONVERSATION, TCP_HOSTS } from '~/lib/packet-lab';
import { button, card, h } from './ml-ui';
import './sec.css';

export function mount(root: HTMLElement): void {
  card(root, 'TCP Conversation Timeline', `Συνθετικό, εκπαιδευτικό σύνολο δεδομένων (όχι πραγματική καταγραφή): client ${TCP_HOSTS.C}, server ${TCP_HOSTS.S}. Relative sequence numbers, όπως τα δείχνει το Wireshark.`);
  let k = 0, https = false;
  const revealed = new Set<number>();
  const mode = h('div', { class: 'ml-row', role: 'group', 'aria-label': 'Εκδοχή' });
  const tableBox = h('div');
  const step = h('div', { class: 'ml-predict', 'aria-live': 'polite' });
  const nav = h('div', { class: 'ml-row' });
  root.append(mode, tableBox, step, nav);

  function render() {
    const segs = TCP_CONVERSATION;
    const s = segs[k]!;
    mode.replaceChildren(...[['Απλό HTTP/1.1 (εργαστήριο)', false], ['Σύγχρονο HTTPS: τι φαίνεται;', true]].map(([l, v]) => {
      const b = button(l as string, () => { https = v as boolean; render(); });
      b.setAttribute('aria-pressed', String(https === v));
      return b;
    }));

    const wrap = h('div', { class: 'ml-table', tabindex: '0', role: 'region', 'aria-label': 'Τα segments' });
    const t = h('table');
    t.append(h('caption', {}, 'Βήμα · Αποστολέας → Παραλήπτης · Flags · Seq · Ack · Bytes · Περιεχόμενο'));
    const head = h('tr');
    ['#', 'Κατεύθυνση', 'Flags', 'Seq', 'Ack', 'Bytes', 'Περιεχόμενο'].forEach((c) => head.append(h('th', { scope: 'col' }, c)));
    t.append(head);
    segs.slice(0, k + 1).forEach((x, i) => {
      const tr = h('tr', i === k ? { class: 'hit' } : {});
      const showAck = x.ack === undefined ? '—' : i < k || revealed.has(i) ? String(x.ack) : '?';
      tr.append(
        h('td', {}, String(i + 1)), h('td', {}, x.from === 'C' ? 'Client → Server' : 'Server → Client'),
        h('td', {}, x.flags), h('td', {}, String(x.seq)), h('td', {}, showAck), h('td', {}, String(x.len)),
        h('td', {}, https ? x.https : x.info),
      );
      t.append(tr);
    });
    wrap.append(t);
    tableBox.replaceChildren(wrap);

    step.replaceChildren();
    if (s.ack !== undefined && !revealed.has(k)) {
      const id = `ack-${k}`;
      const input = h('input', { type: 'number', id, step: '1', min: '0' }) as HTMLInputElement;
      const fb = h('p', { class: 'ml-fb' });
      fb.hidden = true;
      const row = h('div', { class: 'ml-row' });
      row.append(h('label', { for: id }, `Πρόβλεψε το Ack του βήματος ${k + 1}:`), input,
        button('Έλεγχος', () => {
          if (input.value.trim() === '') { fb.hidden = false; fb.className = 'ml-fb bad'; fb.textContent = 'Γράψε έναν αριθμό, ή πάτησε «Δείξε».'; return; }
          const ok = Number(input.value) === s.ack;
          revealed.add(k);
          render();
          step.prepend(h('p', { class: `ml-fb ${ok ? 'ok' : 'bad'}` }, ok ? 'Σωστά.' : `Όχι: Ack = ${s.ack}.`));
        }, 'primary'),
        button('Δείξε', () => { revealed.add(k); render(); }, 'ml-quiet'));
      step.append(row, fb, h('p', { class: 'ml-note' }, 'Βοήθεια: Ack = το επόμενο byte που περιμένει ο παραλήπτης = Seq της άλλης πλευράς + bytes που έλαβε (+1 για SYN ή FIN).'));
    } else {
      step.append(h('p', {}, s.explain));
      if (https) step.append(h('p', { class: 'ml-note' }, 'Με HTTPS το Wireshark δείχνει IP, θύρες, χρονισμό, flags και Seq/Ack· το περιεχόμενο HTTP φαίνεται μόνο ως κρυπτογραφημένα «TLS Application Data» (και η θύρα θα ήταν 443).'));
    }

    nav.replaceChildren(
      button('Προηγούμενο', () => { k = Math.max(0, k - 1); render(); }),
      button('Επόμενο', () => { k = Math.min(segs.length - 1, k + 1); render(); }, 'primary'),
      button('Από την αρχή', () => { k = 0; revealed.clear(); render(); }, 'ml-quiet'),
    );
    (nav.children[0] as HTMLButtonElement).disabled = k === 0;
    (nav.children[1] as HTMLButtonElement).disabled = k === segs.length - 1;
  }

  render();
}
