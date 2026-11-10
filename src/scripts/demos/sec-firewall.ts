/**
 * Firewall Rule Order Lab (CN6003 Week 2): four rules, packets to ports
 * 22/23/80/443. The student reorders the rules and sees which one each
 * packet meets first. Simplified first-match model; real platforms differ.
 * Logic: src/lib/attack-tree-calc.ts (firstMatch, tested).
 */
import { LAB_RULES, firstMatch, type Rule } from '~/lib/attack-tree-calc';
import { button, card, h, predictBox } from './ml-ui';
import './sec.css';

const PORTS: [number, string][] = [[22, 'SSH'], [23, 'Telnet'], [80, 'HTTP'], [443, 'HTTPS']];
const ruleText = (r: Rule) => `${r.action === 'ALLOW' ? 'Επίτρεψε' : 'Μπλόκαρε'} ${r.port === 'any' ? 'όλα' : `θύρα ${r.port}`}`;

export function mount(root: HTMLElement): void {
  card(root, 'Firewall Rule Order Lab', 'Στόχος: να περνά μόνο το HTTPS και το SSH, ενώ Telnet και HTTP να μπλοκάρονται. Άλλαξε τη σειρά των κανόνων· κάθε πακέτο εφαρμόζει τον πρώτο κανόνα που ταιριάζει.');
  let rules = [...LAB_RULES];
  const ask = h('div');
  ask.append(predictBox('με την αρχική σειρά, τι γίνεται ένα πακέτο προς τη θύρα 23 (Telnet);', ['Περνά', 'Μπλοκάρεται'], 'Περνά',
    'Ο κανόνας 2 «Επίτρεψε όλα» ταιριάζει πριν φτάσουμε στον κανόνα 3 «Μπλόκαρε θύρα 23», που δεν εξετάζεται ποτέ.', () => {}));
  const list = h('ol', { class: 'sec-steps', 'aria-label': 'Κανόνες, με τη σειρά που εξετάζονται' });
  const result = h('div', { 'aria-live': 'polite' });
  const actions = h('div', { class: 'ml-row' });
  root.append(ask, list, result, actions,
    h('p', { class: 'ml-note' }, 'Απλοποιημένο μοντέλο «πρώτης αντιστοίχισης» (first match). Η ακριβής συμπεριφορά εξαρτάται από την πλατφόρμα και την πολιτική κανόνων.'));

  function move(i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= rules.length) return;
    const next = [...rules];
    [next[i], next[j]] = [next[j]!, next[i]!];
    rules = next;
    render();
  }

  function render() {
    list.replaceChildren();
    rules.forEach((r, i) => {
      const li = h('li');
      li.append(h('span', {}, `${ruleText(r)} `));
      const up = button('↑', () => move(i, -1));
      up.setAttribute('aria-label', `Μετακίνησε πάνω: ${ruleText(r)}`);
      up.disabled = i === 0;
      const down = button('↓', () => move(i, 1));
      down.setAttribute('aria-label', `Μετακίνησε κάτω: ${ruleText(r)}`);
      down.disabled = i === rules.length - 1;
      li.append(up, down);
      list.append(li);
    });

    const wrap = h('div', { class: 'ml-table', tabindex: '0', role: 'region', 'aria-label': 'Αποτελέσματα ανά πακέτο' });
    const t = h('table');
    t.append(h('caption', {}, 'Τι γίνεται κάθε πακέτο'));
    const head = h('tr');
    ['Πακέτο', 'Πρώτος κανόνας που ταιριάζει', 'Αποτέλεσμα', 'Στόχος'].forEach((c) => head.append(h('th', { scope: 'col' }, c)));
    t.append(head);
    let allOk = true;
    for (const [port, name] of PORTS) {
      const m = firstMatch(rules, port);
      const action = m.rule?.action ?? 'DENY';
      const want = port === 22 || port === 443 ? 'ALLOW' : 'DENY';
      if (action !== want) allOk = false;
      const tr = h('tr', action === want ? {} : { class: 'hit-x' });
      tr.append(
        h('td', {}, `θύρα ${port} (${name})`),
        h('td', {}, m.rule ? `${m.index + 1}. ${ruleText(m.rule)}` : 'κανένας (προεπιλογή: μπλόκαρε)'),
        h('td', {}, action === 'ALLOW' ? 'περνά' : 'μπλοκάρεται'),
        h('td', {}, action === want ? '✓ όπως θέλουμε' : '✗ όχι όπως θέλουμε'),
      );
      t.append(tr);
    }
    wrap.append(t);
    result.replaceChildren(wrap, h('p', { class: `ml-fb ${allOk ? 'ok' : 'bad'}` }, allOk
      ? 'Πέτυχε: οι ειδικοί κανόνες μπλοκαρίσματος εξετάζονται πριν από το γενικό «Επίτρεψε όλα».'
      : 'Ακόμη όχι: κάποιο πακέτο ταιριάζει πρώτα με λάθος κανόνα. Βάλε τους ειδικούς κανόνες πριν από τους γενικούς.'));

    actions.replaceChildren(button('Αρχική σειρά', () => { rules = [...LAB_RULES]; render(); }, 'ml-quiet'));
  }

  render();
}
