/**
 * Attack-tree arithmetic for the CN6003 Week 2 calculator
 * (src/scripts/demos/sec-attack-tree.ts) and the firewall rule-order lab.
 *
 * Cost mode: OR = cheapest child, AND = sum of children.
 * Probability mode (independent events): AND = Π p, OR = 1 − Π (1 − p).
 * Trees are the lecture's: the safe (Schneier) and company Χ.
 */

export type Gate = 'AND' | 'OR';
export type Mode = 'cost' | 'probability';

export interface TreeNode {
  id: string;
  label: string;
  gate?: Gate;
  /** Leaf value: a cost in $ or a probability 0–1. */
  value?: number;
  /** Leaf needs special equipment (the safe tree's «ΕΕ»). */
  equipment?: boolean;
  children?: TreeNode[];
}

export interface Step {
  id: string;
  label: string;
  gate: Gate;
  inputs: number[];
  result: number;
  /** The arithmetic, written out (Greek decimal comma). */
  formula: string;
}

const fmt = (v: number, mode: Mode) =>
  !Number.isFinite(v)
    ? '—'
    : mode === 'cost'
      ? v.toLocaleString('el-GR', { maximumFractionDigits: 0 })
      : v.toLocaleString('el-GR', { maximumFractionDigits: 6 });

export function andProb(ps: number[]): number {
  return ps.reduce((a, p) => a * p, 1);
}

export function orProb(ps: number[]): number {
  return 1 - ps.reduce((a, p) => a * (1 - p), 1);
}

export function combine(gate: Gate, mode: Mode, xs: number[]): number {
  if (mode === 'cost') return gate === 'OR' ? Math.min(...xs) : xs.reduce((a, b) => a + b, 0);
  return gate === 'OR' ? orProb(xs) : andProb(xs);
}

function formula(gate: Gate, mode: Mode, xs: number[], r: number): string {
  const f = (v: number) => fmt(v, mode);
  if (mode === 'cost') return gate === 'OR' ? `min(${xs.map(f).join(', ')}) = ${f(r)}` : `${xs.map(f).join(' + ')} = ${f(r)}`;
  return gate === 'OR'
    ? `1 − (${xs.map((p) => f(1 - p)).join(' × ')}) = ${f(r)}`
    : `${xs.map(f).join(' × ')} = ${f(r)}`;
}

export interface EvalOptions {
  /** Cost mode: leave out leaves that need special equipment. */
  noEquipment?: boolean;
  /** Override a node's gate (id → gate). */
  gates?: Record<string, Gate>;
  /** Override a leaf's value (id → value). */
  values?: Record<string, number>;
}

/** Evaluates bottom-up. Steps come in post-order (children before parent). */
export function evaluate(root: TreeNode, mode: Mode, opts: EvalOptions = {}): { value: number; steps: Step[]; values: Record<string, number> } {
  const steps: Step[] = [];
  const values: Record<string, number> = {};
  const walk = (n: TreeNode): number => {
    if (!n.children?.length) {
      let v = opts.values?.[n.id] ?? n.value;
      if (v === undefined) throw new Error(`leaf ${n.id} has no value`);
      if (mode === 'cost' && opts.noEquipment && n.equipment) v = Infinity;
      values[n.id] = v;
      return v;
    }
    const xs = n.children.map(walk);
    const gate = opts.gates?.[n.id] ?? n.gate ?? 'OR';
    const r = combine(gate, mode, xs);
    values[n.id] = r;
    steps.push({ id: n.id, label: n.label, gate, inputs: xs, result: r, formula: formula(gate, mode, xs, r) });
    return r;
  };
  const value = walk(root);
  return { value, steps, values };
}

/** Lecture example: open the safe (costs in $, «ΕΕ» = special equipment). */
export const SAFE: TreeNode = {
  id: 'safe', label: 'Άνοιξε το χρηματοκιβώτιο', gate: 'OR', children: [
    { id: 'pick', label: 'Παραβίασε την κλειδαριά', value: 30000, equipment: true },
    { id: 'learn', label: 'Μάθε τον συνδυασμό', gate: 'OR', children: [
      { id: 'written', label: 'Βρες τον συνδυασμό γραμμένο κάπου', value: 75000 },
      { id: 'owner', label: 'Πάρε τον συνδυασμό από τον κάτοχο', gate: 'OR', children: [
        { id: 'threaten', label: 'Απείλησε', value: 60000 },
        { id: 'blackmail', label: 'Εκβίασε', value: 100000 },
        { id: 'eavesdrop', label: 'Κρυφάκουσε', gate: 'AND', children: [
          { id: 'listen', label: 'Άκου τη συνομιλία', value: 20000, equipment: true },
          { id: 'say', label: 'Κάνε τον κάτοχο να πει τον συνδυασμό', value: 40000 },
        ] },
        { id: 'bribe', label: 'Δωροδόκησε', value: 20000 },
      ] },
    ] },
    { id: 'cut', label: 'Κόψε το χρηματοκιβώτιο', value: 10000, equipment: true },
    { id: 'install', label: 'Εκμεταλλεύσου κακή εγκατάσταση', value: 100000 },
  ],
};

/** Lecture example: access to company Χ's sensitive data (probabilities). */
export const COMPANY_X: TreeNode = {
  id: 'root', label: 'Πρόσβαση στα ευαίσθητα δεδομένα της Χ', gate: 'OR', children: [
    { id: 'cred', label: 'Κλοπή credentials', gate: 'OR', children: [
      { id: 'spear', label: 'Spear phishing', value: 0.3 },
      { id: 'keylog', label: 'Keylogger / malware στο laptop', value: 0.2 },
      { id: 'social', label: 'Κοινωνική μηχανική για τον κωδικό', value: 0.1 },
    ] },
    { id: 'vuln', label: 'Εκμετάλλευση ευπάθειας', gate: 'OR', children: [
      { id: 'smb', label: 'Unpatched υπηρεσία SMB', value: 0.25 },
      { id: 'zeroday', label: 'Zero-day στον web server', value: 0.15 },
      { id: 'attach', label: 'Custom malware σε συνημμένο', value: 0.2 },
    ] },
    { id: 'phys', label: 'Φυσική πρόσβαση', gate: 'OR', children: [
      { id: 'entry', label: 'Μη εξουσιοδοτημένη είσοδος στο κτίριο', value: 0.05 },
      { id: 'badge', label: 'Κλοπή κάρτας (badge)', value: 0.1 },
      { id: 'tailgate', label: 'Tailgating', value: 0.1 },
    ] },
  ],
};

/** Every inner node, top-down (root first). */
export function innerNodes(root: TreeNode): TreeNode[] {
  const out: TreeNode[] = [];
  const walk = (n: TreeNode) => { if (n.children?.length) { out.push(n); n.children.forEach(walk); } };
  walk(root);
  return out;
}

export function leaves(root: TreeNode): TreeNode[] {
  const out: TreeNode[] = [];
  const walk = (n: TreeNode) => (n.children?.length ? n.children.forEach(walk) : out.push(n));
  walk(root);
  return out;
}

// ---- Firewall rule order (simplified first-match model) ----

export interface Rule {
  id: string;
  action: 'ALLOW' | 'DENY';
  /** Destination port, or 'any'. */
  port: number | 'any';
}

export function firstMatch(rules: Rule[], port: number): { rule: Rule | undefined; index: number } {
  const index = rules.findIndex((r) => r.port === 'any' || r.port === port);
  return { rule: rules[index], index };
}

/** Lab rules, in the "wrong" order: the general ALLOW comes before the DENY. */
export const LAB_RULES: Rule[] = [
  { id: 'r-web', action: 'ALLOW', port: 443 },
  { id: 'r-all', action: 'ALLOW', port: 'any' },
  { id: 'r-telnet', action: 'DENY', port: 23 },
  { id: 'r-http', action: 'DENY', port: 80 },
];
