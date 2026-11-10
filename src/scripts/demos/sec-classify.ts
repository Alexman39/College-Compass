/**
 * Two CN6003 Week 1 classifiers in one module:
 *  - sec-cia: which CIA goals does an incident hit? (more than one allowed)
 *  - sec-attacks: which of the four attack forms, and passive or active?
 * One case at a time: choose, «Έλεγχος», then the explanation and the next
 * case. Data: src/lib/security-basics.ts (tested).
 */
import { ATTACK_CASES, CIA_CASES, CIA_LABEL, FORM_LABEL, sameSet, type AttackForm, type Cia } from '~/lib/security-basics';
import { button, card, h } from './ml-ui';
import './sec.css';

interface Round {
  text: string;
  groups: { label: string; options: [string, string][]; multi: boolean; answer: string[] }[];
  explain: string;
}

const ciaRounds: Round[] = CIA_CASES.map((c) => ({
  text: c.text,
  groups: [{ label: 'Στόχοι CIA', options: (['C', 'I', 'A'] as Cia[]).map((k) => [k, CIA_LABEL[k]]), multi: true, answer: c.answer }],
  explain: `${c.why} Μέτρο: ${c.measure}`,
}));

const attackRounds: Round[] = ATTACK_CASES.map((c) => ({
  text: c.text,
  groups: [
    { label: 'Μορφή', options: (Object.keys(FORM_LABEL) as AttackForm[]).map((k) => [k, FORM_LABEL[k]]), multi: false, answer: [c.form] },
    { label: 'Είδος', options: [['passive', 'Παθητική'], ['active', 'Ενεργητική']], multi: false, answer: [c.passive ? 'passive' : 'active'] },
  ],
  explain: c.why,
}));

export function mount(root: HTMLElement): void {
  const cia = root.dataset.demo === 'sec-cia';
  const rounds = cia ? ciaRounds : attackRounds;
  card(
    root,
    cia ? 'CIA Classifier' : 'Attack Type Classifier',
    cia
      ? 'Ποιους στόχους της τριάδας πλήττει κάθε περιστατικό; Μπορείς να διαλέξεις περισσότερους από έναν.'
      : 'Σε ποια από τις τέσσερις μορφές ανήκει κάθε επίθεση, και είναι παθητική ή ενεργητική;',
  );

  let i = 0, score = 0, checked = false;
  let picked: Set<string>[] = [];
  const counter = h('p', { class: 'ml-note', 'aria-live': 'polite' });
  const text = h('p', { class: 'sec-case' });
  const groups = h('div', { class: 'ml-predict' });
  const actions = h('div', { class: 'ml-row' });
  const fb = h('p', { class: 'ml-fb', 'aria-live': 'polite' });
  root.append(counter, text, groups, actions, fb);

  function render() {
    const r = rounds[i]!;
    counter.textContent = `Περίπτωση ${i + 1} από ${rounds.length} · σωστές: ${score}`;
    text.textContent = r.text;
    groups.replaceChildren();
    r.groups.forEach((g, gi) => {
      const row = h('div', { class: 'ml-row', role: 'group', 'aria-label': g.label });
      row.append(h('span', { class: 'ml-q' }, `${g.label}:`));
      for (const [key, label] of g.options) {
        const b = button(label, () => {
          if (checked) return;
          const set = picked[gi]!;
          if (g.multi) set.has(key) ? set.delete(key) : set.add(key);
          else { set.clear(); set.add(key); }
          render();
        });
        b.setAttribute('aria-pressed', String(picked[gi]!.has(key)));
        if (checked) b.disabled = true;
        row.append(b);
      }
      groups.append(row);
    });

    actions.replaceChildren();
    if (!checked) {
      const ready = picked.every((s) => s.size > 0);
      const check = button('Έλεγχος', () => grade(false), 'primary');
      check.disabled = !ready;
      actions.append(check, button('Δείξε', () => grade(true), 'ml-quiet'));
    } else if (i < rounds.length - 1) {
      actions.append(button('Επόμενη περίπτωση', () => { i++; reset(); }, 'primary'));
    } else {
      actions.append(button('Ξανά από την αρχή', () => { i = 0; score = 0; reset(); }, 'primary'));
    }
  }

  function grade(shown: boolean) {
    const r = rounds[i]!;
    const answers = r.groups.map((g) => g.answer.map((k) => g.options.find(([o]) => o === k)![1]).join(' + '));
    const ok = !shown && r.groups.every((g, gi) => sameSet([...picked[gi]!], g.answer));
    if (ok) score++;
    checked = true;
    fb.hidden = false;
    fb.className = `ml-fb ${shown ? '' : ok ? 'ok' : 'bad'}`;
    fb.textContent = `${shown ? 'Η απάντηση' : ok ? 'Σωστά' : 'Όχι ακριβώς· η απάντηση'}: ${answers.join(' · ')}. ${r.explain}`;
    if (i === rounds.length - 1) fb.textContent += ` Τέλος: ${score} σωστές από ${rounds.length}.`;
    render();
  }

  function reset() {
    checked = false;
    picked = rounds[i]!.groups.map(() => new Set<string>());
    fb.hidden = true;
    render();
  }

  reset();
}
