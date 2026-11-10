/**
 * Data and logic for the CN6003 Week 1 labs (src/scripts/demos/sec-*.ts):
 * the CIA classifier, the attack-type classifier, the risk-scoring lab and the
 * McCumber explorer. Everything here is our own teaching material, built on
 * the lesson's e-shop example; it is not taken from the lecture.
 */

export type Cia = 'C' | 'I' | 'A';

export const CIA_LABEL: Record<Cia, string> = {
  C: 'Εμπιστευτικότητα (C)',
  I: 'Ακεραιότητα (I)',
  A: 'Διαθεσιμότητα (A)',
};

export interface CiaCase {
  text: string;
  /** The goals the incident mainly hits. */
  answer: Cia[];
  why: string;
  measure: string;
}

export const CIA_CASES: CiaCase[] = [
  {
    text: 'Ένας υπάλληλος στέλνει κατά λάθος τη λίστα πελατών σε λάθος παραλήπτη.',
    answer: ['C'],
    why: 'Τα στοιχεία είδε κάποιος που δεν έπρεπε· δεν άλλαξαν και η υπηρεσία λειτουργεί.',
    measure: 'Έλεγχος πρόσβασης, κρυπτογράφηση συνημμένων, πολιτική αποστολής δεδομένων (DLP).',
  },
  {
    text: 'Κάποιος αλλάζει το IBAN επιστροφών χρημάτων στον λογαριασμό ενός πελάτη.',
    answer: ['I'],
    why: 'Τα δεδομένα άλλαξαν χωρίς άδεια· το πρόβλημα είναι η αξιοπιστία τους.',
    measure: 'Επιβεβαίωση αλλαγών από δεύτερο κανάλι, καταγραφή (audit trail), διαχωρισμός καθηκόντων.',
  },
  {
    text: 'Το checkout δεν απαντά για δύο ώρες λόγω επίθεσης DDoS.',
    answer: ['A'],
    why: 'Οι νόμιμοι πελάτες δεν μπορούν να χρησιμοποιήσουν την υπηρεσία.',
    measure: 'Προστασία DDoS, rate limiting, πλεονασμός, monitoring.',
  },
  {
    text: 'Ransomware κρυπτογραφεί τη βάση παραγγελιών και οι δράστες απειλούν να τη δημοσιεύσουν.',
    answer: ['C', 'A'],
    why: 'Η βάση δεν είναι διαθέσιμη (A) και η απειλή δημοσιοποίησης σημαίνει ότι τα δεδομένα διέρρευσαν (C).',
    measure: 'Αντίγραφα ασφαλείας εκτός δικτύου, patching, τμηματοποίηση δικτύου, κρυπτογράφηση αποθήκευσης.',
  },
  {
    text: 'Διαγράφονται όλες οι παραγγελίες από τη βάση δεδομένων.',
    answer: ['I', 'A'],
    why: 'Τα δεδομένα αλλοιώθηκαν (διαγραφή) και δεν είναι πια διαθέσιμα. Ανάλογα με το περιστατικό μπορεί να πλήττεται και η εμπιστευτικότητα.',
    measure: 'Αντίγραφα ασφαλείας, περιορισμένα δικαιώματα διαγραφής, καταγραφή.',
  },
  {
    text: 'Ένας επιτιθέμενος σε ανοιχτό Wi-Fi διαβάζει κωδικούς από σελίδα χωρίς HTTPS.',
    answer: ['C'],
    why: 'Παθητική υποκλοπή: διαβάζει χωρίς να αλλάζει κάτι.',
    measure: 'TLS σε όλες τις σελίδες, HSTS, MFA.',
  },
  {
    text: 'Μια επίθεση MitM αλλάζει το ποσό μιας πληρωμής κατά τη μετάδοση.',
    answer: ['I'],
    why: 'Το μήνυμα έφτασε, αλλά αλλοιωμένο. Αν ο δράστης διάβασε και το περιεχόμενο, πλήττεται επιπλέον η εμπιστευτικότητα.',
    measure: 'Σωστό TLS με έλεγχο πιστοποιητικών, MAC ή ψηφιακές υπογραφές.',
  },
  {
    text: 'Μια πλημμύρα στο data center κλείνει τους servers του e-shop.',
    answer: ['A'],
    why: 'Δεν υπάρχει επιτιθέμενος, αλλά η υπηρεσία δεν είναι διαθέσιμη: η ασφάλεια καλύπτει και τυχαίες απειλές.',
    measure: 'Εφεδρικό site σε άλλη τοποθεσία, αντίγραφα ασφαλείας, σχέδιο ανάκαμψης.',
  },
];

/** Same set, any order. */
export function sameSet<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x));
}

export type AttackForm = 'interruption' | 'interception' | 'modification' | 'fabrication';

export const FORM_LABEL: Record<AttackForm, string> = {
  interruption: 'Διακοπή',
  interception: 'Αναχαίτιση',
  modification: 'Τροποποίηση',
  fabrication: 'Πλαστογράφηση',
};

export interface AttackCase {
  text: string;
  form: AttackForm;
  passive: boolean;
  why: string;
}

export const ATTACK_CASES: AttackCase[] = [
  {
    text: 'Κάποιος κόβει το καλώδιο που συνδέει το γραφείο με το Internet.',
    form: 'interruption',
    passive: false,
    why: 'Η ροή σταματά· η πληροφορία δεν φτάνει. Πλήττεται η διαθεσιμότητα.',
  },
  {
    text: 'Ένα εργαλείο sniffing καταγράφει την κίνηση ενός δικτύου χωρίς να την αλλάζει.',
    form: 'interception',
    passive: true,
    why: 'Ο δράστης μόνο διαβάζει. Δεν αφήνει ίχνη, γι’ αυτό εντοπίζεται δύσκολα.',
  },
  {
    text: 'Ψεύτικες απαντήσεις DNS στέλνουν τους πελάτες σε κακόβουλη σελίδα.',
    form: 'modification',
    passive: false,
    why: 'Αλλάζει η πληροφορία στη διαδρομή (DNS spoofing): ο χρήστης ζήτησε σωστό όνομα και πήρε λάθος διεύθυνση.',
  },
  {
    text: 'Ένα email που φαίνεται να έρχεται από την τράπεζα, αλλά το έφτιαξε ο επιτιθέμενος.',
    form: 'fabrication',
    passive: false,
    why: 'Δημιουργείται ψεύτικο μήνυμα και παρουσιάζεται ως γνήσιο (email spoofing). Πλήττεται η αυθεντικότητα.',
  },
  {
    text: 'Κάποιος παρατηρεί μόνο ποιοι υπολογιστές επικοινωνούν, πότε και πόσο συχνά.',
    form: 'interception',
    passive: true,
    why: 'Ανάλυση κίνησης (traffic analysis): δεν διαβάζει το περιεχόμενο, αλλά αποκτά πληροφορία χωρίς άδεια.',
  },
  {
    text: 'Μια ψεύτικη εφαρμογή «e-shop» στο κατάστημα εφαρμογών ζητά τα στοιχεία της κάρτας.',
    form: 'fabrication',
    passive: false,
    why: 'Δημιουργείται κάτι ψεύτικο που παρουσιάζεται ως γνήσιο, όπως στο παράδειγμα της διάλεξης με τις ψεύτικες εφαρμογές. Πλήττεται η αυθεντικότητα.',
  },
  {
    text: 'Botnet κατακλύζει τον web server με αιτήματα.',
    form: 'interruption',
    passive: false,
    why: 'DDoS: οι νόμιμοι χρήστες δεν εξυπηρετούνται.',
  },
  {
    text: 'Ένας εισβολέας αλλάζει τις τιμές προϊόντων στη βάση δεδομένων.',
    form: 'modification',
    passive: false,
    why: 'Αλλοίωση δεδομένων (data tampering): πλήττεται η ακεραιότητα.',
  },
];

/** Risk score on the 1–5 × 1–5 teaching scale. */
export function riskScore(likelihood: number, impact: number): number {
  if (![likelihood, impact].every((v) => Number.isInteger(v) && v >= 1 && v <= 5)) {
    throw new RangeError('likelihood and impact are integers 1–5');
  }
  return likelihood * impact;
}

export type RiskBand = 'Χαμηλός' | 'Μέτριος' | 'Υψηλός' | 'Κρίσιμος';

/** Our own banding of the 1–25 score (ordinal, not a probability). */
export function riskBand(score: number): RiskBand {
  if (score <= 4) return 'Χαμηλός';
  if (score <= 9) return 'Μέτριος';
  if (score <= 16) return 'Υψηλός';
  return 'Κρίσιμος';
}

export const BAND_ADVICE: Record<RiskBand, string> = {
  Χαμηλός: 'Συχνά μπορεί να γίνει τεκμηριωμένη αποδοχή, με καταγραφή και περιοδική επανεξέταση.',
  Μέτριος: 'Χρειάζεται σχέδιο μείωσης σε εύλογο χρόνο και παρακολούθηση.',
  Υψηλός: 'Προτεραιότητα: μέτρα μείωσης άμεσα, ή αποφυγή της δραστηριότητας.',
  Κρίσιμος: 'Άμεση αντιμετώπιση και ενημέρωση της διοίκησης· η αποδοχή χωρίς μέτρα δύσκολα δικαιολογείται.',
};

export type Goal = 'C' | 'I' | 'A';
export type State = 'storage' | 'transmission' | 'processing';
export type Means = 'technology' | 'policy' | 'people';

export const GOALS: [Goal, string][] = [['C', 'Εμπιστευτικότητα'], ['I', 'Ακεραιότητα'], ['A', 'Διαθεσιμότητα']];
export const STATES: [State, string][] = [['storage', 'Αποθήκευση'], ['transmission', 'Μετάδοση'], ['processing', 'Επεξεργασία']];
export const MEANS: [Means, string][] = [['technology', 'Τεχνολογία'], ['policy', 'Πολιτικές και διαδικασίες'], ['people', 'Ανθρώπινοι παράγοντες']];

/** One e-shop example per cell of the cube (3 × 3 × 3 = 27). */
export const MCCUMBER: Record<`${Goal}-${State}-${Means}`, string> = {
  'C-storage-technology': 'Κρυπτογράφηση των στοιχείων πελατών στη βάση δεδομένων.',
  'C-storage-policy': 'Πολιτική διατήρησης: διαγραφή στοιχείων που δεν χρειάζονται πια (data retention).',
  'C-storage-people': 'Εκπαίδευση: τα αντίγραφα της βάσης δεν μπαίνουν σε προσωπικά USB ή cloud.',
  'C-transmission-technology': 'TLS (HTTPS) για τα στοιχεία της κάρτας.',
  'C-transmission-policy': 'Κανόνας: στοιχεία πελατών δεν στέλνονται ποτέ με απλό email.',
  'C-transmission-people': 'Εκπαίδευση στο phishing: κανείς δεν δίνει κωδικούς σε όποιον τους ζητά τηλεφωνικά.',
  'C-processing-technology': 'Ο αριθμός της κάρτας εμφανίζεται μασκαρισμένος (**** 1234) στο admin panel.',
  'C-processing-policy': 'Μόνο ο ρόλος «λογιστήριο» βλέπει πλήρη στοιχεία πληρωμής.',
  'C-processing-people': 'Κλείδωμα οθόνης όταν ο υπάλληλος απομακρύνεται από τον σταθμό εργασίας.',
  'I-storage-technology': 'Hash ή ψηφιακή υπογραφή στα αρχεία τιμολογίων, για να φαίνεται αν άλλαξαν.',
  'I-storage-policy': 'Οι αλλαγές τιμών καταγράφονται και ελέγχονται κάθε εβδομάδα.',
  'I-storage-people': 'Εκπαίδευση στη σωστή καταχώριση και στον έλεγχο πριν από την αποθήκευση.',
  'I-transmission-technology': 'Αυθεντικοποιημένη κρυπτογράφηση στο TLS: μια αλλοίωση στη διαδρομή εντοπίζεται.',
  'I-transmission-policy': 'Αλλαγή IBAN προμηθευτή μόνο μετά από επιβεβαίωση από δεύτερο κανάλι.',
  'I-transmission-people': 'Οι υπάλληλοι μαθαίνουν να αναγνωρίζουν μηνύματα με αλλαγμένα στοιχεία πληρωμής.',
  'I-processing-technology': 'Έλεγχοι εγκυρότητας: το ποσό παραγγελίας δεν μπορεί να είναι αρνητικό.',
  'I-processing-policy': 'Διπλή έγκριση (διαχωρισμός καθηκόντων) για κάθε επιστροφή χρημάτων.',
  'I-processing-people': 'Εκπαίδευση στο admin panel, ώστε να μη γίνονται λάθος μαζικές αλλαγές.',
  'A-storage-technology': 'Αντίγραφα ασφαλείας και αποθήκευση σε πλεονάζοντες δίσκους (RAID).',
  'A-storage-policy': 'Πρόγραμμα backup με τακτική δοκιμή επαναφοράς.',
  'A-storage-people': 'Ορισμένος υπεύθυνος για τα backups και αναπληρωτής του.',
  'A-transmission-technology': 'Κατανομή φορτίου (load balancing), CDN και προστασία DDoS.',
  'A-transmission-policy': 'SLA με τον πάροχο Internet για χρόνο αποκατάστασης βλαβών.',
  'A-transmission-people': 'Η ομάδα ξέρει ποιον καλεί και τι κάνει σε περίπτωση DDoS.',
  'A-processing-technology': 'Δεύτερος server που αναλαμβάνει αν ο πρώτος σταματήσει (failover).',
  'A-processing-policy': 'Σχέδιο αντιμετώπισης περιστατικών και ανάκαμψης (incident response, recovery).',
  'A-processing-people': 'Ασκήσεις ετοιμότητας: η ομάδα δοκιμάζει το σχέδιο ανάκαμψης.',
};

export function mccumber(goal: Goal, state: State, means: Means): string {
  return MCCUMBER[`${goal}-${state}-${means}`];
}
