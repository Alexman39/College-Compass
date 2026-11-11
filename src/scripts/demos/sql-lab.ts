/**
 * CN6003 Week 7 — four tools in one module, dispatched by data-demo:
 *  - sql-query:     a SELECT playground over a fake in-memory database;
 *  - sql-injection: the login-bypass lab (vulnerable string-building vs a
 *                   parameterised query), the centrepiece of the week;
 *  - sql-union:     a UNION data-extraction lab on a search box;
 *  - sql-keys:      a classifier for keys (PK/FK) and cardinality (1:1/1:N/M:N).
 * Everything is simulated: the engine in src/lib/sql-lab.ts (tested) builds and
 * parses the queries itself. No real database, network or storage is touched.
 */
import { runLogin, runQuery, runSearch, type QueryResult } from '~/lib/sql-lab';
import { button, card, h, table } from './ml-ui';
import './sec.css';

function resultTable(res: QueryResult): HTMLElement {
  if (res.rows.length === 0) return h('p', { class: 'ml-note' }, '0 εγγραφές.');
  const rows = res.rows.map((r) => res.columns.map((c) => String(r[c] ?? '')));
  return table(res.columns, rows, `${res.rows.length} εγγραφές`);
}

function queryBox(text: string, cls = ''): HTMLElement {
  return h('pre', { class: `sec-term ${cls}`, 'aria-label': 'Το ερώτημα SQL' }, text);
}

// ---- sql-query: the SELECT playground ---------------------------------------

function mountQuery(root: HTMLElement) {
  card(root, 'Παιχνιδότοπος SQL (SELECT)', 'Γράψε ένα ερώτημα SELECT και τρέξε το πάνω σε μια μικρή, εικονική βάση. Υποστηρίζονται WHERE, LIKE, AND/OR, ORDER BY και LIMIT. Πίνακες: products, users.');
  const schema = h('p', { class: 'ml-note' }, 'products(id, name, category, price, stock) · users(id, username, display_name, role)');
  const input = h('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Ερώτημα SQL', class: 'sec-pw-input', value: 'SELECT name, price FROM products WHERE price > 50 ORDER BY price DESC' });
  const field = h('div', { class: 'ml-row' });
  field.append(input, button('Εκτέλεσε', () => run(), 'primary'));
  const examples = h('div', { class: 'ml-row', role: 'group', 'aria-label': 'Παραδείγματα' });
  examples.append(h('span', { class: 'ml-note' }, 'Δοκίμασε: '));
  for (const ex of [
    'SELECT * FROM products',
    "SELECT name FROM products WHERE category = 'Οθόνες'",
    "SELECT name FROM products WHERE name LIKE 'Ο%'",
    'SELECT username, role FROM users WHERE id >= 2',
  ]) examples.append(button(ex, () => { input.value = ex; run(); }, 'sec-mono ml-quiet'));
  const out = h('div', { 'aria-live': 'polite' });
  root.append(schema, field, examples, out);

  function run() {
    out.replaceChildren();
    try {
      out.append(resultTable(runQuery(input.value)));
    } catch (e) {
      out.append(h('p', { class: 'ml-fb bad' }, (e as Error).message));
    }
  }
  input.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') run(); });
  run();
}

// ---- sql-injection: the login-bypass lab ------------------------------------

function mountInjection(root: HTMLElement) {
  card(root, 'Εργαστήριο: παράκαμψη σύνδεσης (SQL injection)', 'Μια (ψεύτικη) φόρμα σύνδεσης. Δες πώς, όταν το ερώτημα φτιάχνεται με ένωση κειμένου, μια απλή εισαγωγή σε παρακάμπτει — και πώς η παραμετροποιημένη έκδοση το σταματά. Τίποτα πραγματικό δεν δοκιμάζεται.');
  const warn = h('p', { class: 'ml-warn' }, 'Προσομοίωση μέσα στον browser. Τα δεδομένα είναι εικονικά. Η τεχνική δείχνεται για να την καταλάβεις και να αμυνθείς — ποτέ εναντίον συστήματος που δεν σου ανήκει.');

  let mode: 'vulnerable' | 'safe' = 'vulnerable';
  const modeRow = h('div', { class: 'ml-row', role: 'group', 'aria-label': 'Τρόπος σύνταξης ερωτήματος' });
  const user = h('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Όνομα χρήστη', placeholder: 'όνομα χρήστη', class: 'sec-pw-input' });
  const pass = h('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Κωδικός', placeholder: 'κωδικός', class: 'sec-pw-input' });
  const uRow = h('label', { class: 'sec-term-prompt' }, ''); uRow.append(h('span', {}, 'χρήστης: '), user);
  const pRow = h('label', { class: 'sec-term-prompt' }, ''); pRow.append(h('span', {}, 'κωδικός: '), pass);
  const presets = h('div', { class: 'ml-row', role: 'group', 'aria-label': 'Έτοιμες εισαγωγές' });
  presets.append(
    h('span', { class: 'ml-note' }, 'Βάλε: '),
    button('Κανονικά (admin)', () => { user.value = 'admin'; pass.value = 'S3cur3!Pass'; render(); }, 'sec-mono ml-quiet'),
    button("' OR '1'='1' #", () => { user.value = "' OR '1'='1' #"; pass.value = ''; render(); }, 'sec-mono ml-quiet'),
    button("admin'#", () => { user.value = "admin'#"; pass.value = 'κενό'; render(); }, 'sec-mono ml-quiet'),
  );
  const query = h('div', {});
  const verdict = h('p', { class: 'ml-fb', 'aria-live': 'polite' });
  const rows = h('div', { 'aria-live': 'polite' });
  root.append(warn, modeRow, uRow, pRow, presets, button('Σύνδεση', () => render(), 'primary'), query, verdict, rows);

  function setMode(m: 'vulnerable' | 'safe') { mode = m; render(); }
  function renderModes() {
    modeRow.replaceChildren(h('span', { class: 'ml-note' }, 'Ερώτημα: '));
    const mk = (m: 'vulnerable' | 'safe', label: string) => {
      const b = button(label, () => setMode(m), m === mode ? 'primary' : '');
      b.setAttribute('aria-pressed', String(m === mode));
      return b;
    };
    modeRow.append(mk('vulnerable', 'Ευάλωτο (ένωση κειμένου)'), mk('safe', 'Ασφαλές (παραμετροποιημένο)'));
  }

  function render() {
    renderModes();
    const r = runLogin(user.value, pass.value, mode);
    query.replaceChildren(
      h('p', { class: 'ml-note' }, mode === 'vulnerable' ? 'Το ερώτημα που στέλνεται στη βάση:' : 'Το ερώτημα + οι παράμετροι (χωριστά):'),
      queryBox(r.query, mode === 'vulnerable' ? 'sec-term-vuln' : 'sec-term-safe'),
      ...(r.params ? [h('p', { class: 'ml-note sec-mono' }, `params = [ '${r.params.join("', '")}' ]`)] : []),
    );
    rows.replaceChildren();
    if (r.error) {
      verdict.className = 'ml-fb';
      verdict.textContent = `Συντακτικό σφάλμα στο ερώτημα: ${r.error}`;
    } else if (r.bypassed) {
      verdict.className = 'ml-fb bad';
      verdict.textContent = `⚠ Παράκαμψη! Μπήκες χωρίς σωστό κωδικό — το ερώτημα επέστρεψε ${r.rows.length} χρήστες.`;
      rows.append(resultTable({ columns: ['id', 'username', 'display_name', 'role'], rows: r.rows.map((x) => ({ id: x.id!, username: x.username!, display_name: x.display_name!, role: x.role! })) }));
    } else if (r.ok) {
      verdict.className = 'ml-fb ok';
      verdict.textContent = `Επιτυχής σύνδεση ως «${r.rows[0]!.display_name}» (με σωστά στοιχεία).`;
    } else {
      verdict.className = 'ml-fb';
      verdict.textContent = mode === 'safe' && (user.value.includes("'") || pass.value.includes("'"))
        ? 'Αποτυχία σύνδεσης. Η εισαγωγή αντιμετωπίστηκε ως απλό κείμενο — καμία παράκαμψη.'
        : 'Αποτυχία σύνδεσης: λάθος στοιχεία.';
    }
  }
  user.addEventListener('input', render);
  pass.addEventListener('input', render);
  user.value = 'admin'; pass.value = 'S3cur3!Pass';
  render();
}

// ---- sql-union: data extraction through UNION -------------------------------

function mountUnion(root: HTMLElement) {
  card(root, 'Εργαστήριο: διαρροή δεδομένων με UNION', 'Μια αναζήτηση χρηστών. Στην ευάλωτη έκδοση, ένα UNION SELECT διαβάζει έναν πίνακα που η σελίδα δεν ήθελε ποτέ να δείξει (secrets). Στην ασφαλή έκδοση, το ίδιο κείμενο είναι απλώς ένας όρος αναζήτησης.');
  const warn = h('p', { class: 'ml-warn' }, 'Προσομοίωση· ο πίνακας secrets περιέχει εικονικά «μυστικά». Στόχος είναι να δεις τον μηχανισμό και την άμυνα.');
  let mode: 'vulnerable' | 'safe' = 'vulnerable';
  const modeRow = h('div', { class: 'ml-row', role: 'group', 'aria-label': 'Τρόπος σύνταξης' });
  const input = h('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Αναζήτηση', placeholder: 'όνομα για αναζήτηση…', class: 'sec-pw-input' });
  const field = h('div', { class: 'ml-row' }); field.append(input, button('Αναζήτηση', () => render(), 'primary'));
  const presets = h('div', { class: 'ml-row', role: 'group', 'aria-label': 'Έτοιμες εισαγωγές' });
  presets.append(
    h('span', { class: 'ml-note' }, 'Βάλε: '),
    button('Έλενα', () => { input.value = 'Έλενα'; render(); }, 'sec-mono ml-quiet'),
    button("%' UNION SELECT label, value FROM secrets #", () => { input.value = "%' UNION SELECT label, value FROM secrets #"; render(); }, 'sec-mono ml-quiet'),
  );
  const query = h('div', {});
  const verdict = h('p', { class: 'ml-fb', 'aria-live': 'polite' });
  const out = h('div', { 'aria-live': 'polite' });
  root.append(warn, modeRow, field, presets, query, verdict, out);

  function renderModes() {
    modeRow.replaceChildren(h('span', { class: 'ml-note' }, 'Ερώτημα: '));
    const mk = (m: 'vulnerable' | 'safe', label: string) => {
      const b = button(label, () => { mode = m; render(); }, m === mode ? 'primary' : '');
      b.setAttribute('aria-pressed', String(m === mode));
      return b;
    };
    modeRow.append(mk('vulnerable', 'Ευάλωτο (ένωση κειμένου)'), mk('safe', 'Ασφαλές (παραμετροποιημένο)'));
  }
  function render() {
    renderModes();
    const r = runSearch(input.value, mode);
    query.replaceChildren(h('p', { class: 'ml-note' }, 'Το ερώτημα:'), queryBox(r.query, mode === 'vulnerable' ? 'sec-term-vuln' : 'sec-term-safe'));
    out.replaceChildren();
    if (r.error) { verdict.className = 'ml-fb'; verdict.textContent = `Σφάλμα: ${r.error}`; return; }
    if (r.leaked) { verdict.className = 'ml-fb bad'; verdict.textContent = '⚠ Διέρρευσαν δεδομένα από τον πίνακα secrets!'; }
    else if (mode === 'safe' && input.value.includes('UNION')) { verdict.className = 'ml-fb ok'; verdict.textContent = 'Καμία διαρροή — το UNION έμεινε απλό κείμενο αναζήτησης.'; }
    else { verdict.className = 'ml-fb'; verdict.textContent = `${r.rows.length} αποτελέσματα.`; }
    out.append(resultTable(r));
  }
  render();
}

// ---- sql-keys: keys & cardinality classifier --------------------------------

type KeyRound = { text: string; options: [string, string][]; answer: string; why: string };
const KEY_ROUNDS: KeyRound[] = [
  {
    text: 'Στον πίνακα mathites, το πεδίο id έχει μοναδική τιμή για κάθε μαθητή και ξεχωρίζει την κάθε εγγραφή.',
    options: [['pk', 'Πρωτεύον κλειδί'], ['fk', 'Ξένο κλειδί'], ['plain', 'Απλό πεδίο']],
    answer: 'pk', why: 'Το πρωτεύον κλειδί (PRIMARY KEY) ταυτοποιεί μοναδικά κάθε εγγραφή του πίνακα.',
  },
  {
    text: 'Στον πίνακα course υπάρχει το πεδίο c_am, που δείχνει στο am του πίνακα teacher (ποιος καθηγητής το διδάσκει).',
    options: [['pk', 'Πρωτεύον κλειδί'], ['fk', 'Ξένο κλειδί'], ['plain', 'Απλό πεδίο']],
    answer: 'fk', why: 'Το ξένο κλειδί (FOREIGN KEY) αναφέρεται στο πρωτεύον κλειδί άλλου πίνακα και φτιάχνει τη σύνδεση.',
  },
  {
    text: 'Κάθε τμήμα (department) διευθύνεται από έναν ακριβώς manager, και κάθε manager διευθύνει ένα τμήμα.',
    options: [['1:1', '1:1'], ['1:N', '1:N'], ['M:N', 'M:N']],
    answer: '1:1', why: 'Ένα προς ένα: βάζουμε το κλειδί του ενός πίνακα ως ξένο κλειδί στον άλλο.',
  },
  {
    text: 'Ένα τμήμα απασχολεί πολλούς υπαλλήλους, αλλά κάθε υπάλληλος ανήκει σε ένα μόνο τμήμα.',
    options: [['1:1', '1:1'], ['1:N', '1:N'], ['M:N', 'M:N']],
    answer: '1:N', why: 'Ένα προς πολλά: το κλειδί της «μιας» πλευράς (τμήμα) μπαίνει ως ξένο κλειδί στην «πολλά» (υπάλληλος).',
  },
  {
    text: 'Ένας υπάλληλος δουλεύει σε πολλά έργα (projects) και κάθε έργο υλοποιείται από πολλούς υπαλλήλους.',
    options: [['1:1', '1:1'], ['1:N', '1:N'], ['M:N', 'M:N']],
    answer: 'M:N', why: 'Πολλά προς πολλά: χρειάζεται τρίτος πίνακας-σύνδεσμος με τα κλειδιά και των δύο ως ξένα κλειδιά.',
  },
  {
    text: 'Το πεδίο HOURS καταγράφει πόσες ώρες την εβδομάδα δουλεύει ένας υπάλληλος σε ένα έργο.',
    options: [['rel', 'Πεδίο της συσχέτισης'], ['pk', 'Πρωτεύον κλειδί'], ['derived', 'Παραγόμενο πεδίο']],
    answer: 'rel', why: 'Ανήκει στη συσχέτιση WORKS_ON (υπάλληλος–έργο), όχι σε μία μόνο οντότητα.',
  },
];

function mountKeys(root: HTMLElement) {
  card(root, 'Κλειδιά & πολλαπλότητα', 'Κατάταξε κάθε περίπτωση: πρωτεύον ή ξένο κλειδί, και πολλαπλότητα συσχέτισης 1:1, 1:N ή M:N. Παραδείγματα από τη βάση της εταιρείας της διάλεξης.');
  let i = 0, score = 0, checked = false, pick: string | null = null;
  const counter = h('p', { class: 'ml-note', 'aria-live': 'polite' });
  const text = h('p', { class: 'sec-case' });
  const opts = h('div', { class: 'ml-row', role: 'group', 'aria-label': 'Επιλογές' });
  const actions = h('div', { class: 'ml-row' });
  const fb = h('p', { class: 'ml-fb', 'aria-live': 'polite', hidden: 'true' });
  root.append(counter, text, opts, actions, fb);

  function render() {
    const r = KEY_ROUNDS[i]!;
    counter.textContent = `Ερώτηση ${i + 1} από ${KEY_ROUNDS.length} · σωστά: ${score}`;
    text.textContent = r.text;
    opts.replaceChildren();
    for (const [key, label] of r.options) {
      const b = button(label, () => { if (!checked) { pick = key; render(); } });
      b.setAttribute('aria-pressed', String(pick === key));
      if (checked) b.disabled = true;
      opts.append(b);
    }
    actions.replaceChildren();
    if (!checked) {
      const check = button('Έλεγχος', () => grade(false), 'primary');
      check.disabled = pick === null;
      actions.append(check, button('Δείξε', () => grade(true), 'ml-quiet'));
    } else if (i < KEY_ROUNDS.length - 1) {
      actions.append(button('Επόμενο', () => { i++; reset(); }, 'primary'));
    } else {
      actions.append(button('Ξανά', () => { i = 0; score = 0; reset(); }, 'primary'));
    }
  }
  function grade(shown: boolean) {
    const r = KEY_ROUNDS[i]!;
    const label = r.options.find(([k]) => k === r.answer)![1];
    const ok = !shown && pick === r.answer;
    if (ok) score++;
    checked = true; fb.hidden = false;
    fb.className = `ml-fb ${shown ? '' : ok ? 'ok' : 'bad'}`;
    fb.textContent = `${shown ? 'Απάντηση' : ok ? 'Σωστά' : 'Όχι'}: ${label}. ${r.why}`;
    if (i === KEY_ROUNDS.length - 1) fb.textContent += ` Τέλος: ${score} από ${KEY_ROUNDS.length}.`;
    render();
  }
  function reset() { checked = false; pick = null; fb.hidden = true; render(); }
  reset();
}

export function mount(root: HTMLElement): void {
  const which = root.dataset.demo;
  if (which === 'sql-query') mountQuery(root);
  else if (which === 'sql-injection') mountInjection(root);
  else if (which === 'sql-union') mountUnion(root);
  else mountKeys(root);
}
