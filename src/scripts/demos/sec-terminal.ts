/**
 * Terminal labs (CN6003 Week 5), mounted for two data-demo names:
 *  - sec-unix: a UNIX shell on an in-memory file system, with six missions
 *    (logic: src/lib/shell-lab.ts, tested);
 *  - sec-wincmd: a Windows prompt on one synthetic workstation, with three
 *    planted findings to report (logic: src/lib/netcmd-lab.ts, tested).
 * Nothing runs on the student's computer.
 */
import * as unix from '~/lib/shell-lab';
import * as win from '~/lib/netcmd-lab';
import { button, card, h } from './ml-ui';
import './sec.css';

interface Term {
  prompt: () => string;
  exec: (line: string) => { out: string; err: string };
  quick: string[];
}

function terminal(root: HTMLElement, t: Term, onRun: (line: string, out: string) => void) {
  const screen = h('pre', { class: 'sec-term', 'aria-live': 'polite', 'aria-label': 'Έξοδος τερματικού', tabindex: '0' });
  const form = h('form', { class: 'sec-term-line' });
  const label = h('label', { class: 'sec-term-prompt' });
  const input = h('input', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Εντολή' });
  label.append(h('span', {}, t.prompt()), input);
  form.append(label, button('Εκτέλεσε', () => form.requestSubmit(), 'primary'));
  const quick = h('div', { class: 'ml-row', role: 'group', 'aria-label': 'Γρήγορες εντολές' });
  for (const q of t.quick) quick.append(button(q, () => { input.value = q; form.requestSubmit(); }, 'sec-mono'));
  root.append(screen, form, quick);

  const past: string[] = [];
  let back = 0;
  const print = (text: string, cls = '') => {
    const span = h('span', cls ? { class: cls } : {}, text);
    screen.append(span);
    screen.scrollTop = screen.scrollHeight;
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const line = input.value;
    if (line.trim() === 'clear') {
      screen.replaceChildren();
    } else {
      print(t.prompt() + line + '\n', 'sec-term-cmd');
      const r = t.exec(line);
      if (r.out) print(r.out);
      if (r.err) print(r.err + '\n', 'sec-term-err');
      onRun(line, r.out);
    }
    if (line.trim()) past.push(line);
    back = 0;
    input.value = '';
    label.firstElementChild!.textContent = t.prompt();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    back = Math.max(0, Math.min(past.length, back + (e.key === 'ArrowUp' ? 1 : -1)));
    input.value = back ? past[past.length - back]! : '';
  });
  return { print };
}

function mountUnix(root: HTMLElement) {
  card(root, 'UNIX shell', 'Ένα UNIX shell με δικό του σύστημα αρχείων, μόνο στον browser. Γράψε εντολές του μαθήματος· «help» για τη λίστα, ↑ για την προηγούμενη εντολή. Τα αρχεία του φακέλου σου: users.txt, log.txt, scores.txt, secret.txt και ο φάκελος notes.');
  const sh = unix.newShell();
  const done = new Set<string>();
  const shown = new Set<string>();
  const list = h('ol', { class: 'sec-steps', 'aria-label': 'Αποστολές' });
  const render = () => {
    list.replaceChildren();
    for (const m of unix.MISSIONS) {
      const li = h('li', done.has(m.id) ? { class: 'sec-done' } : {});
      li.append(h('span', {}, `${done.has(m.id) ? '✓ ' : ''}${m.task} `));
      if (shown.has(m.id)) li.append(h('code', { class: 'sec-hint' }, m.hint));
      else if (!done.has(m.id)) {
        const b = button('Βοήθεια', () => { shown.add(m.id); render(); }, 'ml-quiet');
        b.setAttribute('aria-label', `Βοήθεια για την αποστολή ${unix.MISSIONS.indexOf(m) + 1}`);
        li.append(b);
      }
      list.append(li);
    }
  };
  const { print } = terminal(root, {
    prompt: () => unix.prompt(sh),
    exec: (line) => unix.run(sh, line),
    quick: ['ls -l', 'pwd', 'cat users.txt', 'grep ERROR log.txt', 'who | wc -l', 'help'],
  }, (line, out) => {
    for (const m of unix.MISSIONS) {
      if (!done.has(m.id) && m.done(sh, line, out)) {
        done.add(m.id);
        print(`✓ Αποστολή: ${m.task}\n`, 'sec-term-ok');
      }
    }
    render();
  });
  root.append(h('p', { class: 'ml-q' }, 'Αποστολές'), list,
    h('p', { class: 'ml-note' }, 'Απλοποιήσεις: ένας χρήστης, ο student, που κατέχει ό,τι είναι στον φάκελό του και στο /tmp, άρα εκεί μετράνε τα δικαιώματα του ιδιοκτήτη· όλα τα υπόλοιπα ανήκουν στον root και δεν αλλάζουν. Η ημερομηνία είναι σταθερή. Η σύνταξη ακολουθεί τη διάλεξη (csh: >& για τα σφάλματα).'));
  render();
}

function mountWin(root: HTMLElement) {
  card(root, 'Γραμμή εντολών Windows: διερεύνηση', `Ο σταθμός ${win.PC.name} φέρεται «αργός» και ύποπτος. Με τις δικτυακές εντολές του μαθήματος βρες τρία προβλήματα· τα αποτελέσματα είναι συνθετικά, δεν τρέχει τίποτα στον υπολογιστή σου.`);
  terminal(root, {
    prompt: () => win.PROMPT,
    exec: (line) => ({ out: win.run(line), err: '' }),
    quick: ['ipconfig /all', 'ping 192.168.1.1', 'tracert www.google.com', 'netstat -ano', 'arp -a', 'net localgroup Administrators'],
  }, () => {});
  const answers = h('div', { 'aria-live': 'polite' });
  const checks = h('fieldset', { class: 'sec-findings' });
  checks.append(h('legend', {}, 'Τι βρήκες; Σημείωσε όσα επιβεβαίωσες με κάποια εντολή.'));
  const decoys = [
    { id: 'ping', label: 'Η πύλη δεν απαντά στο ping' },
    { id: 'dns', label: 'Ο DNS δεν βρίσκει το www.google.com' },
  ];
  const all = [...win.FINDINGS.map((f) => ({ id: f.id, label: f.label })), ...decoys].sort((a, b) => a.label.localeCompare(b.label, 'el'));
  for (const f of all) {
    const l = h('label');
    l.append(h('input', { type: 'checkbox', value: f.id }), document.createTextNode(` ${f.label}`));
    checks.append(l);
  }
  const check = button('Έλεγξε', () => {
    const picked = new Set([...checks.querySelectorAll<HTMLInputElement>('input:checked')].map((i) => i.value));
    const real = new Set<string>(win.FINDINGS.map((f) => f.id));
    const right = [...picked].filter((p) => real.has(p)).length;
    const wrong = [...picked].filter((p) => !real.has(p));
    answers.replaceChildren(h('p', { class: `ml-fb ${right === real.size && !wrong.length ? 'ok' : 'bad'}` },
      `${right} από ${real.size} σωστά${wrong.length ? `, και ${wrong.length} που δεν ισχύει (δοκίμασε την εντολή ξανά)` : ''}.`));
    const tbl = h('ul');
    for (const f of win.FINDINGS) tbl.append(h('li', {}, `${f.label}: φαίνεται με ${f.how}.`));
    if (right === real.size && !wrong.length) {
      answers.append(tbl, h('p', { class: 'ml-note' }, 'Τι σημαίνουν: το svch0st.exe (με μηδέν) μιμείται το νόμιμο svchost.exe και ακούει στην 4444, συνηθισμένη θύρα για backdoor· ζητά και σύνδεση στη θύρα 6667 (IRC), κλασικό κανάλι ελέγχου botnet. Η πύλη 192.168.1.1 και το 192.168.1.66 έχουν την ίδια MAC: κάποιος απαντά για την πύλη (ARP spoofing, MitM). Ο λογαριασμός helpdesk είναι διαχειριστής, και ο κωδικός του ορίστηκε στις 3:12 τα ξημερώματα (net user helpdesk): ύποπτο για λογαριασμό που έφτιαξε ο εισβολέας.'));
    }
  });
  const row = h('div', { class: 'ml-row' });
  row.append(check);
  root.append(checks, row, answers);
}

export function mount(root: HTMLElement): void {
  if (root.dataset.demo === 'sec-wincmd') mountWin(root);
  else mountUnix(root);
}
