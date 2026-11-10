/**
 * Network Attack Explorer (CN6003 Week 2): DNS cache poisoning, ARP spoofing
 * and SYN flood, each in three views: normal operation, attack, defence.
 * Teaching descriptions only, no exploitation instructions.
 */
import { button, card, h, predictBox } from './ml-ui';
import './sec.css';

type View = 'normal' | 'attack' | 'defence';
interface Scenario {
  key: string;
  label: string;
  cia: string;
  question: string;
  options: string[];
  answer: string;
  why: string;
  views: Record<View, string[]>;
}

const SCENARIOS: Scenario[] = [
  {
    key: 'dns', label: 'DNS cache poisoning', cia: 'Κυρίως ακεραιότητα: η απάντηση στο «ποια IP έχει αυτό το όνομα;» είναι ψευδής.',
    question: 'ο χρήστης πληκτρολόγησε σωστά το όνομα. Πού καταλήγει μετά τη δηλητηρίαση;',
    options: ['Στον νόμιμο server', 'Σε λάθος (κακόβουλο) server'], answer: 'Σε λάθος (κακόβουλο) server',
    why: 'Η cache του διακομιστή DNS έχει αποθηκεύσει ψευδή εγγραφή, οπότε δίνει λάθος IP σε όποιον ρωτήσει.',
    views: {
      normal: ['Ο χρήστης ρωτά τον διακομιστή DNS: «ποια IP έχει το example.com;».', 'Η cache έχει σωστή εγγραφή και επιστρέφει τη σωστή IP.', 'Ο browser συνδέεται στον νόμιμο server.'],
      attack: ['Η cache του διακομιστή DNS έχει αποθηκεύσει μια πλαστή εγγραφή για το όνομα.', 'Ο χρήστης κάνει το ίδιο ερώτημα και παίρνει την IP του επιτιθέμενου.', 'Ο browser καταλήγει σε κακόβουλο server, χωρίς ο χρήστης να το αντιληφθεί.'],
      defence: ['Σωστές ρυθμίσεις και ενημερώσεις στους διακομιστές DNS.', 'Έλεγχος DNSSEC, όπου εφαρμόζεται: οι εγγραφές έχουν ψηφιακή υπογραφή.', 'Επαλήθευση HTTPS: ένας ψεύτικος server δεν έχει έγκυρο πιστοποιητικό για το όνομα.'],
    },
  },
  {
    key: 'arp', label: 'ARP spoofing / MitM', cia: 'Εμπιστευτικότητα και ακεραιότητα: ο ενδιάμεσος μπορεί να διαβάσει ή να αλλάξει την κίνηση.',
    question: 'μετά το ARP spoofing, από πού περνά η κίνηση του χρήστη προς το Internet;',
    options: ['Απευθείας από τον router', 'Από τη συσκευή του επιτιθέμενου'], answer: 'Από τη συσκευή του επιτιθέμενου',
    why: 'Ο επιτιθέμενος έπεισε τον χρήστη ότι η δική του MAC ανήκει στην IP του router.',
    views: {
      normal: ['Ο χρήστης θέλει να στείλει κίνηση στον router (π.χ. 192.168.1.1).', 'Μέσω ARP μαθαίνει τη MAC του router και την κρατά στην ARP cache.', 'Τα frames πηγαίνουν κατευθείαν στον router.'],
      attack: ['Ο επιτιθέμενος στέλνει ψεύτικες απαντήσεις ARP: «η IP του router έχει τη δική μου MAC».', 'Η ARP cache του χρήστη ενημερώνεται με τη λάθος MAC.', 'Η κίνηση περνά από τον επιτιθέμενο (Man-in-the-Middle) πριν φτάσει στον router.'],
      defence: ['Προστασία του τοπικού δικτύου (π.χ. έλεγχοι στον switch, τμηματοποίηση).', 'Σωστά επαληθευμένο TLS: ο ενδιάμεσος βλέπει την κίνηση αλλά όχι το περιεχόμενο.', 'Παρακολούθηση για ύποπτες αλλαγές στις αντιστοιχίσεις IP–MAC.'],
    },
  },
  {
    key: 'syn', label: 'SYN flood', cia: 'Διαθεσιμότητα: ο server δεν μπορεί να δεχτεί νέες νόμιμες συνδέσεις.',
    question: 'γιατί γεμίζει ο server, αφού οι συνδέσεις δεν ολοκληρώνονται ποτέ;',
    options: ['Κρατά μισάνοιχτες συνδέσεις και περιμένει ACK', 'Του τελειώνει το εύρος ζώνης από τα SYN'], answer: 'Κρατά μισάνοιχτες συνδέσεις και περιμένει ACK',
    why: 'Για κάθε SYN ο server στέλνει SYN-ACK και κρατά πόρους για ένα ACK που δεν φτάνει ποτέ, συχνά επειδή η IP του αποστολέα είναι πλαστή.',
    views: {
      normal: ['Πελάτης → server: SYN.', 'Server → πελάτης: SYN-ACK.', 'Πελάτης → server: ACK. Η σύνδεση ανοίγει.'],
      attack: ['Ο επιτιθέμενος στέλνει πάρα πολλά SYN, συχνά από πλαστές IP.', 'Ο server απαντά SYN-ACK και περιμένει ACK που δεν έρχεται.', 'Ο πίνακας μισάνοιχτων συνδέσεων γεμίζει· οι νόμιμοι πελάτες δεν εξυπηρετούνται.'],
      defence: ['Rate limiting και προστασία DDoS.', 'Παρακολούθηση του αριθμού μισάνοιχτων συνδέσεων.', 'Κατάλληλες ρυθμίσεις δικτύου και του λειτουργικού για τη χειραψία TCP.'],
    },
  },
];

const VIEW_LABEL: [View, string][] = [['normal', 'Κανονική λειτουργία'], ['attack', 'Επίθεση'], ['defence', 'Άμυνα']];

export function mount(root: HTMLElement): void {
  card(root, 'Network Attack Explorer', 'Διάλεξε επίθεση και δες την κανονική λειτουργία, την επίθεση και την άμυνα. Πριν από την όψη «Επίθεση», πρόβλεψε τι θα συμβεί.');
  let si = 0;
  let view: View = 'normal';
  const predicted = new Set<string>();
  const boxes = new Map<string, HTMLElement>();

  const sRow = h('div', { class: 'ml-row', role: 'group', 'aria-label': 'Επίθεση' });
  const sBtns = SCENARIOS.map((s, i) => button(s.label, () => { si = i; view = 'normal'; render(); }));
  sRow.append(...sBtns);
  const vRow = h('div', { class: 'ml-row', role: 'group', 'aria-label': 'Όψη' });
  const body = h('div', { 'aria-live': 'polite' });
  root.append(sRow, vRow, body);

  function render() {
    const s = SCENARIOS[si]!;
    sBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === si)));
    vRow.replaceChildren(...VIEW_LABEL.map(([v, l]) => {
      const b = button(l, () => { view = v; render(); });
      b.setAttribute('aria-pressed', String(v === view));
      return b;
    }));
    body.replaceChildren();
    if (view === 'attack') {
      if (!boxes.has(s.key)) boxes.set(s.key, predictBox(s.question, s.options, s.answer, s.why, () => { predicted.add(s.key); render(); }));
      body.append(boxes.get(s.key)!);
      if (!predicted.has(s.key)) return;
    }
    const ol = h('ol', { class: 'sec-steps' });
    s.views[view].forEach((line) => ol.append(h('li', {}, line)));
    body.append(ol);
    if (view === 'attack') body.append(h('p', { class: 'ml-fb bad' }, s.cia));
  }

  render();
}
