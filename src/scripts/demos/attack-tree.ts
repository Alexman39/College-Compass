/**
 * Interactive attack-tree explorer (CN6003 Week 2). Mounted into
 * <div data-demo="attack-tree"> by src/scripts/demos.ts.
 *
 * Pick a tree, click a node: a leaf's value can be changed, an inner node
 * switched between AND and OR, and every value up to the root is recomputed.
 * Parsing, computing and drawing are src/lib/attack-tree.ts, the same code
 * that draws the ```attack-tree blocks in the lesson.
 */
import './water-jug.css';
import './attack-tree.css';
import { cheapest, evaluate, format, formula, likeliest, nodes, parse, render, type AttackNode, type AttackTree } from '~/lib/attack-tree';

const TREES: { id: string; label: string; about: string; text: string; hideInner?: boolean }[] = [
  {
    id: 'safe',
    label: 'Χρηματοκιβώτιο · κόστος',
    about: 'Το παράδειγμα του Schneier. OR: ο επιτιθέμενος διαλέγει το φθηνότερο παιδί· AND: τα κόστη αθροίζονται.',
    text: `mode: cost
unit: $

Άνοιξε το χρηματοκιβώτιο | OR
  Παραβίασε την κλειδαριά | 30.000 | ΕΕ
  Μάθε τον συνδυασμό | OR
    Βρες τον συνδυασμό γραμμένο κάπου | 75.000
    Πάρε τον από τον κάτοχο | OR
      Απείλησε | 60.000
      Εκβίασε | 100.000
      Κρυφάκουσε | AND
        Άκου τη συνομιλία | 20.000 | ΕΕ
        Κάνε τον να πει τον συνδυασμό | 40.000
      Δωροδόκησε | 20.000
  Κόψε το χρηματοκιβώτιο | 10.000 | ΕΕ
  Εκμεταλλεύσου κακή εγκατάσταση | 100.000`,
  },
  {
    id: 'company',
    label: 'Εταιρεία Χ · πιθανότητα',
    about: 'Το παράδειγμα της διάλεξης. OR = 1 − Π(1 − pᵢ), AND = Π pᵢ, με την παραδοχή ότι τα γεγονότα είναι ανεξάρτητα.',
    hideInner: true,
    text: `mode: probability

Πρόσβαση στα ευαίσθητα δεδομένα της Χ | OR
  Κλοπή credentials | OR
    spear phishing | 0,30
    keylogger / malware στο laptop | 0,20
    κοινωνική μηχανική για τον κωδικό | 0,10
  Εκμετάλλευση ευπάθειας | OR
    unpatched υπηρεσία SMB | 0,25
    zero-day στον web server | 0,15
    custom malware σε συνημμένο | 0,20
  Φυσική πρόσβαση | OR
    μη εξουσιοδοτημένη είσοδος στο κτίριο | 0,05
    κλοπή κάρτας (badge) | 0,10
    tailgating | 0,10`,
  },
  {
    id: 'mission',
    label: 'Security Mission 2 · υποθετικό',
    about: 'Το υποθετικό μοντέλο του οδηγού της αποστολής: τρεις διαδρομές, η μία σε δύο διαδοχικά στάδια (AND, με δεσμευμένη πιθανότητα).',
    text: `mode: probability

Πρόσβαση σε εταιρικά δεδομένα | OR
  Κλοπή credentials | 0,30
  Εκμετάλλευση server | AND
    Παραβίαση του web server | 0,50
    Από εκεί στον DB Server | 0,40
  Παραβίαση endpoint | 0,15`,
  },
];

function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, text?: string) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text;
  return e;
}

export function mount(root: HTMLElement): void {
  // data-tree="mission" etc. picks the tree it opens with.
  let def = TREES.find((t) => t.id === root.dataset.tree) ?? TREES[0]!;
  let tree: AttackTree = parse(def.text);
  let selected = 0;
  let showInner = !def.hideInner;

  root.replaceChildren();
  root.classList.add('jug', 'atx');

  const sub = h('p', { class: 'jug-sub' });
  const toolbar = h('div', { class: 'jug-toolbar' });
  const pick = h('div', { class: 'jug-seg atx-trees', role: 'group', 'aria-label': 'Δέντρο' });
  const pickBtns = TREES.map((t) => {
    const b = h('button', { type: 'button', 'aria-pressed': String(t === def) }, t.label);
    b.addEventListener('click', () => load(t));
    pick.append(b);
    return b;
  });
  const fsBtn = h('button', { type: 'button', class: 'jug-fs', 'aria-pressed': 'false' }, '⛶ Πλήρης οθόνη');
  toolbar.append(pick, fsBtn);

  // result panel
  const panel = h('div', { class: 'jug-panel atx-result' });
  const rootLabel = h('span', { class: 'atx-root-label' });
  const rootValue = h('strong', { class: 'atx-root-value', 'aria-live': 'polite' });
  const resultText = h('p', { class: 'atx-result-text' });
  const actions = h('div', { class: 'jug-controls' });
  const resetBtn = h('button', { type: 'button' }, '↺ Αρχικές τιμές');
  const innerBtn = h('button', { type: 'button', 'aria-pressed': 'false' }, 'Εμφάνιση υπολογισμών');
  actions.append(resetBtn, innerBtn);
  panel.append(rootLabel, rootValue, resultText, actions);

  const treeWrap = h('div', { class: 'jug-scroll atx-tree' });
  const legend = h('p', { class: 'jug-legend' });

  // editor for the selected node
  const editor = h('div', { class: 'jug-panel atx-editor' });

  const left = h('div', { class: 'jug-left' });
  left.append(treeWrap, legend);
  const right = h('div', { class: 'jug-right' });
  right.append(panel, editor);
  const body = h('div', { class: 'jug-body' });
  body.append(left, right);
  const foot = h('p', { class: 'jug-sub' }, 'Οι αριθμοί είναι εκτιμήσεις ενός μοντέλου, όχι μετρήσεις. Στις πιθανότητες οι τύποι ισχύουν μόνο με την παραδοχή ότι τα γεγονότα είναι ανεξάρτητα· σε διαδοχικά στάδια χρησιμοποιούμε δεσμευμένες πιθανότητες.');
  root.append(sub, toolbar, body, foot);

  // full screen, as in the other explorers
  const setFull = (on: boolean) => {
    root.classList.toggle('is-full', on);
    document.documentElement.classList.toggle('jug-lock', on);
    fsBtn.setAttribute('aria-pressed', String(on));
    fsBtn.textContent = on ? '✕ Έξοδος' : '⛶ Πλήρης οθόνη';
  };
  fsBtn.addEventListener('click', () => {
    const on = !root.classList.contains('is-full');
    if (on) void root.requestFullscreen?.().catch(() => {});
    else if (document.fullscreenElement) void document.exitFullscreen();
    setFull(on);
  });
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && root.classList.contains('is-full')) setFull(false);
  });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('is-full')) setFull(false);
  });

  const all = () => nodes(tree);
  const node = (i: number) => all()[i]!;
  const path = () => (tree.mode === 'cost' ? cheapest(tree) : likeliest(tree));

  function load(t: (typeof TREES)[number]) {
    def = t;
    tree = parse(t.text);
    selected = 0;
    showInner = !t.hideInner;
    pickBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(TREES[i] === def)));
    draw();
  }

  function draw() {
    evaluate(tree, { check: false });
    tree.values = showInner ? 'all' : 'leaves';
    sub.textContent = def.about;
    treeWrap.innerHTML = render(tree, { theme: 'css', selected, interactive: true, highlight: path() });
    const r = tree.root;
    rootLabel.textContent = tree.mode === 'cost' ? 'Φθηνότερη επίθεση (ρίζα)' : 'Πιθανότητα επιτυχίας (ρίζα)';
    rootValue.textContent = showInner ? format(tree, r.value!, true) : '—';
    resultText.textContent = showInner
      ? tree.mode === 'cost'
        ? `Τονισμένη η φθηνότερη διαδρομή: ${[...path()].filter((n) => !n.children.length).map((n) => n.label).join(' + ')}.`
        : `${(r.value! * 100).toFixed(1).replace('.', ',')}%: περίπου ${Math.max(1, Math.round(r.value! * 10))} στις 10 επιθέσεις φτάνουν στον στόχο, αν δεν αλλάξει κάτι. Τονισμένη η πιθανότερη διαδρομή.`
      : 'Οι τιμές των κλάδων και της ρίζας είναι η άσκηση της διάλεξης: υπολόγισέ τες πρώτα μόνος σου και μετά πάτα «Εμφάνιση υπολογισμών».';
    innerBtn.hidden = !def.hideInner;
    innerBtn.setAttribute('aria-pressed', String(showInner));
    innerBtn.textContent = showInner ? 'Απόκρυψη υπολογισμών' : 'Εμφάνιση υπολογισμών';
    legend.textContent =
      tree.mode === 'cost'
        ? 'Πάτα έναν κόμβο: στα φύλλα αλλάζεις το κόστος, στους άλλους κόμβους το AND / OR. Τονισμένη η φθηνότερη επίθεση.'
        : 'Πάτα έναν κόμβο: στα φύλλα αλλάζεις την πιθανότητα, στους άλλους κόμβους το AND / OR. Τονισμένη η πιθανότερη διαδρομή.';
    drawEditor();
  }

  function drawEditor() {
    const n = node(selected);
    editor.replaceChildren();
    editor.append(h('h3', { class: 'jug-h' }, n.label));
    if (n.children.length) {
      const seg = h('div', { class: 'jug-seg', role: 'group', 'aria-label': 'Τελεστής' });
      for (const g of ['OR', 'AND'] as const) {
        const b = h('button', { type: 'button', 'aria-pressed': String(n.gate === g) }, g);
        b.addEventListener('click', () => {
          n.gate = g;
          draw();
        });
        seg.append(b);
      }
      editor.append(seg);
      editor.append(
        h(
          'p',
          { class: 'atx-explain' },
          n.gate === 'OR'
            ? tree.mode === 'cost'
              ? 'OR: αρκεί ένα παιδί, άρα ο επιτιθέμενος διαλέγει το φθηνότερο.'
              : 'OR: αρκεί να πετύχει ένα παιδί, άρα η πιθανότητα ανεβαίνει.'
            : tree.mode === 'cost'
              ? 'AND: χρειάζονται όλα τα παιδιά, άρα τα κόστη αθροίζονται.'
              : 'AND: πρέπει να πετύχουν όλα, άρα η πιθανότητα πέφτει.',
        ),
      );
      if (showInner) editor.append(h('p', { class: 'atx-formula' }, formula(tree, n)));
    } else {
      const id = `atx-${Math.random().toString(36).slice(2, 8)}`;
      const label = h('label', { for: id }, tree.mode === 'cost' ? `Κόστος (${tree.unit || 'μονάδες'})` : 'Πιθανότητα επιτυχίας (0 – 1)');
      const input = h('input', {
        id,
        type: 'number',
        inputmode: 'decimal',
        min: '0',
        ...(tree.mode === 'probability' ? { max: '1', step: '0.01' } : { step: '1000' }),
        value: String(n.given),
      }) as HTMLInputElement;
      input.addEventListener('change', () => {
        let v = Number(input.value);
        if (!Number.isFinite(v) || v < 0) v = 0;
        if (tree.mode === 'probability') v = Math.min(1, v);
        n.given = v;
        draw();
        editor.querySelector<HTMLInputElement>('input')?.focus();
      });
      const row = h('div', { class: 'atx-input' });
      row.append(label, input);
      editor.append(row);
      if (n.tags.length) editor.append(h('p', { class: 'atx-explain' }, `Ετικέτες: ${n.tags.join(', ')}`));
    }
  }

  // select a node by click or keyboard
  const choose = (e: Event) => {
    const g = (e.target as Element).closest<SVGGElement>('[data-node]');
    if (!g) return;
    selected = Number(g.dataset.node);
    draw();
    treeWrap.querySelector<SVGGElement>(`[data-node="${selected}"]`)?.focus();
  };
  treeWrap.addEventListener('click', choose);
  treeWrap.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(e);
    }
  });
  resetBtn.addEventListener('click', () => load(def));
  innerBtn.addEventListener('click', () => {
    showInner = !showInner;
    draw();
  });

  draw();
}

export type { AttackNode };
