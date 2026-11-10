/**
 * TLS 1.3 Handshake Timeline (CN6003 Week 3): the messages between browser
 * and server, one step at a time, with what each one protects. Makes the
 * point that TLS 1.3 agrees keys with (EC)DHE, while RSA (or ECDSA) signs;
 * the old RSA key transport of TLS 1.2 is shown only for comparison.
 */
import { button, card, h } from './ml-ui';
import './sec.css';

interface Msg { from: 'C' | 'S' | '·'; name: string; what: string }

const TLS13: Msg[] = [
  { from: 'C', name: 'ClientHello', what: 'Ο browser προτείνει έκδοση (TLS 1.3), σουίτες κρυπτογράφησης και στέλνει ήδη το δικό του μερίδιο (EC)DHE για τη συμφωνία κλειδιού (key share).' },
  { from: 'S', name: 'ServerHello', what: 'Ο server διαλέγει σουίτα και στέλνει το δικό του μερίδιο (EC)DHE. Από τα δύο μερίδια, και οι δύο πλευρές υπολογίζουν το ίδιο μυστικό· το κλειδί δεν ταξιδεύει ποτέ.' },
  { from: 'S', name: 'Certificate', what: 'Το πιστοποιητικό του server, υπογεγραμμένο από μια Αρχή Πιστοποίησης (CA). Από εδώ και πέρα τα μηνύματα της χειραψίας είναι ήδη κρυπτογραφημένα.' },
  { from: 'S', name: 'CertificateVerify', what: 'Ο server υπογράφει τη μέχρι τώρα χειραψία με το ιδιωτικό του κλειδί (π.χ. RSA ή ECDSA). Εδώ χρησιμοποιείται ο RSA στο TLS 1.3: για υπογραφή, όχι για μεταφορά κλειδιού.' },
  { from: 'S', name: 'Finished', what: 'Ο server επιβεβαιώνει ότι η χειραψία δεν αλλοιώθηκε (MAC πάνω σε όλα τα μηνύματα).' },
  { from: 'C', name: 'Έλεγχος πιστοποιητικού', what: 'Ο browser ελέγχει την αλυσίδα του πιστοποιητικού, το όνομα και την υπογραφή. Αν κάτι δεν είναι έγκυρο, η σύνδεση σταματά.' },
  { from: 'C', name: 'Finished', what: 'Το ίδιο από την πλευρά του browser.' },
  { from: '·', name: 'Application Data', what: 'Τα δεδομένα (π.χ. HTTP) προστατεύονται με γρήγορη συμμετρική αυθεντικοποιημένη κρυπτογράφηση (π.χ. AES-GCM): εμπιστευτικότητα και ακεραιότητα.' },
];

const TLS12_RSA: Msg[] = [
  { from: 'C', name: 'ClientHello', what: 'Ο browser προτείνει έκδοση και σουίτες.' },
  { from: 'S', name: 'ServerHello + Certificate', what: 'Ο server διαλέγει σουίτα και στέλνει το πιστοποιητικό του με το δημόσιο κλειδί RSA.' },
  { from: 'C', name: 'ClientKeyExchange', what: 'Ο browser παράγει ένα μυστικό και το στέλνει κρυπτογραφημένο με το δημόσιο κλειδί RSA του server (RSA key transport). Αν κάποτε διαρρεύσει το ιδιωτικό κλειδί, όλες οι παλιές καταγεγραμμένες συνεδρίες αποκρυπτογραφούνται.' },
  { from: '·', name: 'Finished · Application Data', what: 'Επιβεβαίωση και μετά συμμετρική κρυπτογράφηση των δεδομένων.' },
];

export function mount(root: HTMLElement): void {
  card(root, 'TLS Handshake Timeline', 'Τα μηνύματα μιας σύνδεσης HTTPS, ένα βήμα τη φορά. Βέλος προς τα δεξιά: από τον browser στον server.');
  let legacy = false, k = 0;
  const vRow = h('div', { class: 'ml-row', role: 'group', 'aria-label': 'Έκδοση' });
  const list = h('ol', { class: 'sec-steps' });
  const nav = h('div', { class: 'ml-row' });
  const note = h('p', { class: 'ml-note', 'aria-live': 'polite' });
  root.append(vRow, list, nav, note);

  function render() {
    const msgs = legacy ? TLS12_RSA : TLS13;
    if (k >= msgs.length) k = msgs.length - 1;
    const b13 = button('TLS 1.3 (σήμερα)', () => { legacy = false; k = 0; render(); });
    const b12 = button('TLS 1.2 με RSA key transport (παλαιό)', () => { legacy = true; k = 0; render(); }, 'ml-quiet');
    b13.setAttribute('aria-pressed', String(!legacy));
    b12.setAttribute('aria-pressed', String(legacy));
    vRow.replaceChildren(b13, b12);
    list.replaceChildren();
    msgs.slice(0, k + 1).forEach((m, i) => {
      const dir = m.from === 'C' ? 'Browser → Server' : m.from === 'S' ? 'Server → Browser' : 'Browser ⇄ Server';
      const li = h('li', i === k ? { class: 'on' } : {});
      li.append(h('strong', {}, `${dir}: ${m.name}`));
      if (i === k) li.append(h('div', { style: 'font-weight:400' }, m.what));
      list.append(li);
    });
    nav.replaceChildren(
      button('Προηγούμενο', () => { k = Math.max(0, k - 1); render(); }),
      button('Επόμενο', () => { k = Math.min(msgs.length - 1, k + 1); render(); }, 'primary'),
      button('Από την αρχή', () => { k = 0; render(); }, 'ml-quiet'),
    );
    (nav.children[0] as HTMLButtonElement).disabled = k === 0;
    (nav.children[1] as HTMLButtonElement).disabled = k === msgs.length - 1;
    note.textContent = legacy
      ? 'Το RSA key transport δεν υπάρχει στο TLS 1.3. Το βλέπεις εδώ μόνο για σύγκριση με τις παλαιότερες περιγραφές «ο RSA μεταφέρει το κλειδί συνόδου».'
      : 'Στο TLS 1.3 η συμφωνία κλειδιού γίνεται με (EC)DHE· ο RSA, όπου χρησιμοποιείται, υπογράφει. Ο όρος «SSL» είναι ιστορικός.';
  }

  render();
}
