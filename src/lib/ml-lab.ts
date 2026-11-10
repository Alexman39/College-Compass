/**
 * The numbers behind the CN6005 Week 5 widgets (regression, preprocessing,
 * K-Means, association rules, decision trees). Pure functions and small
 * datasets; tested in ml-lab.test.ts, which also checks every number the
 * lesson quotes. The UI lives in src/scripts/demos/ml-*.ts.
 *
 * Datasets marked «δικό μας» are ours and illustrative, not real data. The
 * lecture's own examples (slides 65, 68, 63, 72, 17, 75–76) are reproduced
 * exactly.
 */

// ---- Regression ---------------------------------------------------------------

/** Hours of study and grade: the lesson's regression example (ours). */
export const STUDY = { x: [1, 2, 3, 4], y: [52, 58, 61, 69] };

export const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;

/** Least squares: ŷ = b0 + b1·x. */
export function fit(x: number[], y: number[]): { b0: number; b1: number } {
  const mx = mean(x), my = mean(y);
  let sxy = 0, sxx = 0;
  x.forEach((xi, i) => { sxy += (xi - mx) * (y[i]! - my); sxx += (xi - mx) ** 2; });
  const b1 = sxy / sxx;
  return { b0: my - b1 * mx, b1 };
}

export const predict = (b0: number, b1: number, x: number) => b0 + b1 * x;

/** Mean squared error of the line b0 + b1·x on the points. */
export function mse(x: number[], y: number[], b0: number, b1: number): number {
  return mean(x.map((xi, i) => (y[i]! - predict(b0, b1, xi)) ** 2));
}

// ---- Scaling and binning --------------------------------------------------------

export const minMax = (v: number, min: number, max: number, newMin = 0, newMax = 1) =>
  max === min ? NaN : ((v - min) / (max - min)) * (newMax - newMin) + newMin;

export const zScore = (v: number, mu: number, sigma: number) => (v - mu) / sigma;

/** Population standard deviation (divide by n). */
export function stdPop(v: number[]): number {
  const m = mean(v);
  return Math.sqrt(mean(v.map((x) => (x - m) ** 2)));
}

/** Decimal scaling: divide by the smallest power of 10 that brings every |v| to ≤ 1. */
export function decimalScaling(v: number[]): { j: number; out: number[] } {
  const big = Math.max(...v.map(Math.abs));
  let j = 0;
  while (big / 10 ** j > 1) j++;
  return { j, out: v.map((x) => x / 10 ** j) };
}

/** Equal-frequency (equi-depth) bins of sorted values. */
export function bins(sorted: number[], k: number): number[][] {
  const size = sorted.length / k;
  return Array.from({ length: k }, (_, i) => sorted.slice(Math.round(i * size), Math.round((i + 1) * size)));
}

export const smoothMeans = (bs: number[][]) => bs.map((b) => b.map(() => mean(b)));

/** Each value → the nearer of its bin's min and max (a tie goes to the min). */
export const smoothBoundaries = (bs: number[][]) =>
  bs.map((b) => b.map((v) => (v - b[0]! <= b.at(-1)! - v ? b[0]! : b.at(-1)!)));

// ---- Preprocessing lab ----------------------------------------------------------

export interface Customer {
  id: string;
  city: string;
  /** null: missing. */
  age: number | null;
  total: number;
  currency: '€' | '$';
  split: 'train' | 'test';
}

/** A small e-shop table with the usual problems (ours, illustrative). */
export const RAW: Customer[] = [
  { id: 'A', city: 'Αθήνα', age: 22, total: 120, currency: '€', split: 'train' },
  { id: 'B', city: 'Πάτρα', age: null, total: 45, currency: '€', split: 'train' },
  { id: 'C', city: 'Αθήνα', age: 28, total: 460, currency: '€', split: 'train' },
  { id: 'C', city: 'Αθήνα', age: 28, total: 460, currency: '€', split: 'train' },
  { id: 'D', city: 'Θεσσαλονίκη', age: 41, total: 110, currency: '$', split: 'train' },
  { id: 'E', city: 'Αθήνα', age: 140, total: 310, currency: '€', split: 'train' },
  { id: 'F', city: 'Πάτρα', age: 35, total: 95, currency: '€', split: 'train' },
  { id: 'G', city: 'Θεσσαλονίκη', age: 30, total: 520, currency: '€', split: 'test' },
];

/** Assumed rate for the example only: 1 $ = 0,90 €. */
export const USD_TO_EUR = 0.9;
export const AGE_MAX_PLAUSIBLE = 110;
export const CITIES = ['Αθήνα', 'Θεσσαλονίκη', 'Πάτρα'];

export type StepId = 'dedupe' | 'currency' | 'outlier' | 'impute' | 'onehot' | 'minmax' | 'zscore';
export const STEPS: StepId[] = ['dedupe', 'currency', 'outlier', 'impute', 'onehot', 'minmax', 'zscore'];

export interface LabRow {
  id: string;
  split: 'train' | 'test';
  cells: Record<string, string | number | null>;
}

export interface LabState {
  columns: string[];
  rows: LabRow[];
  /** Parameters learnt from the training rows only. */
  params: Record<string, number>;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

export function initial(): LabState {
  return {
    columns: ['Πόλη', 'Ηλικία', 'Σύνολο', 'Νόμισμα'],
    rows: RAW.map((c) => ({ id: c.id, split: c.split, cells: { Πόλη: c.city, Ηλικία: c.age, Σύνολο: c.total, Νόμισμα: c.currency } })),
    params: {},
  };
}

/**
 * Apply one step. `leak`: for impute / minmax / zscore, learn the parameters
 * from all rows (wrong: data leakage) instead of the training rows only.
 */
export function apply(s: LabState, step: StepId, leak = false): LabState {
  const rows = s.rows.map((r) => ({ ...r, cells: { ...r.cells } }));
  const learn = leak ? rows : rows.filter((r) => r.split === 'train');
  const nums = (col: string) => learn.map((r) => r.cells[col]).filter((v): v is number => typeof v === 'number');
  const params = { ...s.params };
  let columns = [...s.columns];
  switch (step) {
    case 'dedupe': {
      const seen = new Set<string>();
      const out = rows.filter((r) => {
        const key = JSON.stringify([r.id, r.cells]);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return { columns, rows: out, params };
    }
    case 'currency':
      for (const r of rows) if (r.cells.Νόμισμα === '$') r.cells.Σύνολο = r2((r.cells.Σύνολο as number) * USD_TO_EUR);
      columns = columns.filter((c) => c !== 'Νόμισμα');
      rows.forEach((r) => delete r.cells.Νόμισμα);
      return { columns, rows, params };
    case 'outlier':
      for (const r of rows) if (typeof r.cells.Ηλικία === 'number' && r.cells.Ηλικία > AGE_MAX_PLAUSIBLE) r.cells.Ηλικία = null;
      return { columns, rows, params };
    case 'impute': {
      params.ageMean = mean(nums('Ηλικία'));
      for (const r of rows) if (r.cells.Ηλικία === null) r.cells.Ηλικία = params.ageMean;
      return { columns, rows, params };
    }
    case 'onehot': {
      const i = columns.indexOf('Πόλη');
      const oh = CITIES.map((c) => `Πόλη=${c}`);
      columns = [...columns.slice(0, i), ...oh, ...columns.slice(i + 1)];
      for (const r of rows) {
        for (const c of CITIES) r.cells[`Πόλη=${c}`] = r.cells.Πόλη === c ? 1 : 0;
        delete r.cells.Πόλη;
      }
      return { columns, rows, params };
    }
    case 'minmax': {
      const v = nums('Σύνολο');
      params.totalMin = Math.min(...v);
      params.totalMax = Math.max(...v);
      for (const r of rows) r.cells.Σύνολο = minMax(r.cells.Σύνολο as number, params.totalMin, params.totalMax);
      return { columns, rows, params };
    }
    case 'zscore': {
      const v = nums('Ηλικία');
      params.ageMu = mean(v);
      params.ageSigma = stdPop(v);
      for (const r of rows) r.cells.Ηλικία = zScore(r.cells.Ηλικία as number, params.ageMu, params.ageSigma);
      return { columns, rows, params };
    }
  }
}

export function run(steps: StepId[], leak = false): LabState {
  return steps.reduce((s, st) => apply(s, st, leak), initial());
}

// ---- K-Means ----------------------------------------------------------------------

export interface Pt { id: string; x: number; y: number }

/** Customers: orders per year and average order value in € (ours, illustrative). */
export const CUSTOMERS: Pt[] = [
  { id: 'Π1', x: 1, y: 25 }, { id: 'Π2', x: 2, y: 30 }, { id: 'Π3', x: 2, y: 22 }, { id: 'Π4', x: 3, y: 35 },
  { id: 'Π5', x: 8, y: 30 }, { id: 'Π6', x: 9, y: 40 }, { id: 'Π7', x: 7, y: 28 }, { id: 'Π8', x: 9, y: 25 },
  { id: 'Π9', x: 2, y: 95 }, { id: 'Π10', x: 3, y: 110 }, { id: 'Π11', x: 1, y: 100 }, { id: 'Π12', x: 4, y: 90 },
];

/** Three starting choices: the first k points of each order become the centres. */
export const INITS: { label: string; order: number[] }[] = [
  { label: 'Α', order: [0, 4, 8, 1] },
  { label: 'Β', order: [8, 9, 0, 1] }, // two centres in the same group: gets stuck
  { label: 'Γ', order: [9, 5, 6, 2] },
];

/** K-Means runs on min-max-scaled features, so € does not outweigh orders. */
export function scaler(pts: Pt[]) {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return {
    to: (p: { x: number; y: number }) => ({ x: (p.x - x0) / (x1 - x0), y: (p.y - y0) / (y1 - y0) }),
    from: (p: { x: number; y: number }) => ({ x: p.x * (x1 - x0) + x0, y: p.y * (y1 - y0) + y0 }),
  };
}

export interface KState {
  /** Centres in original units. */
  centres: { x: number; y: number }[];
  /** Cluster of each point, or -1 before the first assignment. */
  assign: number[];
}

export function kInit(pts: Pt[], k: number, init: number): KState {
  return { centres: INITS[init]!.order.slice(0, k).map((i) => ({ x: pts[i]!.x, y: pts[i]!.y })), assign: pts.map(() => -1) };
}

export function kAssign(pts: Pt[], s: KState): { state: KState; changed: number } {
  const sc = scaler(pts);
  const cs = s.centres.map(sc.to);
  const assign = pts.map((p) => {
    const q = sc.to(p);
    let best = 0, bd = Infinity;
    cs.forEach((c, i) => {
      const d = (q.x - c.x) ** 2 + (q.y - c.y) ** 2;
      if (d < bd - 1e-12) { bd = d; best = i; }
    });
    return best;
  });
  const changed = assign.filter((a, i) => a !== s.assign[i]).length;
  return { state: { centres: s.centres, assign }, changed };
}

export function kUpdate(pts: Pt[], s: KState): { state: KState; moved: number } {
  const centres = s.centres.map((c, k) => {
    const mine = pts.filter((_, i) => s.assign[i] === k);
    return mine.length ? { x: mean(mine.map((p) => p.x)), y: mean(mine.map((p) => p.y)) } : c;
  });
  const moved = centres.filter((c, k) => Math.abs(c.x - s.centres[k]!.x) > 1e-9 || Math.abs(c.y - s.centres[k]!.y) > 1e-9).length;
  return { state: { centres, assign: s.assign }, moved };
}

/** Run to convergence; returns the final state and how many assignment rounds it took. */
export function kRun(pts: Pt[], k: number, init: number): { state: KState; rounds: number } {
  let s = kInit(pts, k, init);
  for (let round = 1; round < 50; round++) {
    const a = kAssign(pts, s);
    s = a.state;
    if (a.changed === 0) return { state: s, rounds: round };
    s = kUpdate(pts, s).state;
  }
  return { state: s, rounds: 50 };
}

/** Within-cluster sum of squares, in scaled units. */
export function wcss(pts: Pt[], s: KState): number {
  const sc = scaler(pts);
  return pts.reduce((sum, p, i) => {
    const q = sc.to(p), c = sc.to(s.centres[s.assign[i]!]!);
    return sum + (q.x - c.x) ** 2 + (q.y - c.y) ** 2;
  }, 0);
}

// ---- Association rules ---------------------------------------------------------------

export interface Basket { id: string; items: string[] }

/** The lesson's basket (ours). */
export const SHOP: Basket[] = [
  { id: '1', items: ['καφές', 'γάλα', 'ζάχαρη'] },
  { id: '2', items: ['καφές', 'ζάχαρη'] },
  { id: '3', items: ['γάλα', 'ψωμί'] },
  { id: '4', items: ['καφές', 'γάλα', 'ζάχαρη', 'ψωμί'] },
  { id: '5', items: ['ψωμί', 'βούτυρο'] },
];

/** The lecture's market basket (slide 72). Slide 72 writes «Diaper» in TID 3; it is the same item. */
export const LECTURE_BASKET: Basket[] = [
  { id: '1', items: ['Bread', 'Milk'] },
  { id: '2', items: ['Bread', 'Diapers', 'Beer', 'Eggs'] },
  { id: '3', items: ['Milk', 'Diapers', 'Beer', 'Coke'] },
  { id: '4', items: ['Bread', 'Milk', 'Diapers', 'Beer'] },
  { id: '5', items: ['Coffee', 'Sugar', 'Eggs'] },
  { id: '6', items: ['Bread', 'Milk', 'Diapers', 'Coke'] },
];

export const itemsOf = (bs: Basket[]) => [...new Set(bs.flatMap((b) => b.items))];
const has = (b: Basket, set: string[]) => set.every((i) => b.items.includes(i));

export interface RuleStats {
  n: number;
  /** Baskets with all of X. */
  withX: number;
  /** Baskets with all of X and Y. */
  withXY: number;
  /** Baskets with all of Y. */
  withY: number;
  support: number;
  confidence: number;
  lift: number;
}

export function rule(bs: Basket[], x: string[], y: string[]): RuleStats {
  const n = bs.length;
  const withX = bs.filter((b) => has(b, x)).length;
  const withY = bs.filter((b) => has(b, y)).length;
  const withXY = bs.filter((b) => has(b, [...x, ...y])).length;
  const confidence = withX ? withXY / withX : NaN;
  return { n, withX, withXY, withY, support: withXY / n, confidence, lift: withY ? confidence / (withY / n) : NaN };
}

// ---- Decision trees ------------------------------------------------------------------

export interface TreeNode {
  /** Question nodes: the question, and one child per answer. Leaves: the label. */
  q?: string;
  key?: string;
  branches?: { answer: string; test: (v: string | number | boolean) => boolean; node: TreeNode }[];
  label?: string;
}

export interface Sample {
  id: string;
  values: Record<string, string | number | boolean>;
  /** The true label, when known. */
  truth?: string;
}

export interface DTree { id: 'spam' | 'loan'; label: string; root: TreeNode; samples: Sample[]; keys: [string, string][] }

/** Spam: the lesson's tree (ours); one email is a hacked contact, which the tree gets wrong. */
export const SPAM: DTree = {
  id: 'spam',
  label: 'Φίλτρο spam',
  keys: [['known', 'Γνωστός αποστολέας'], ['word', 'Ύποπτη λέξη']],
  root: {
    q: 'Είναι γνωστός αποστολέας;', key: 'known',
    branches: [
      { answer: 'ναι', test: (v) => v === true, node: { label: 'όχι spam' } },
      { answer: 'όχι', test: (v) => v === false, node: {
        q: 'Περιέχει ύποπτη λέξη;', key: 'word',
        branches: [
          { answer: 'ναι', test: (v) => v === true, node: { label: 'spam' } },
          { answer: 'όχι', test: (v) => v === false, node: { label: 'όχι spam' } },
        ],
      } },
    ],
  },
  samples: [
    { id: 'Email 1: «Σημειώσεις για αύριο» από συμφοιτητή', values: { known: true, word: false }, truth: 'όχι spam' },
    { id: 'Email 2: «ΔΩΡΕΑΝ κινητό!» από άγνωστο', values: { known: false, word: true }, truth: 'spam' },
    { id: 'Email 3: «Η παραγγελία σας εστάλη» από άγνωστο κατάστημα', values: { known: false, word: false }, truth: 'όχι spam' },
    { id: 'Email 4: «Κέρδισες δωρεάν δώρο» από γνωστό, παραβιασμένο λογαριασμό', values: { known: true, word: true }, truth: 'spam' },
  ],
};

/** Loan approval: the lecture's tree (slide 17). The applicants are ours. */
export const LOAN: DTree = {
  id: 'loan',
  label: 'Έγκριση δανείου (διάλεξη)',
  keys: [['status', 'Οικογενειακή κατάσταση'], ['income', 'Εισόδημα (£)'], ['house', 'Ιδιοκτήτης σπιτιού']],
  root: {
    q: 'STATUS;', key: 'status',
    branches: [
      { answer: 'Single', test: (v) => v === 'Single', node: { label: 'No' } },
      { answer: 'Married', test: (v) => v === 'Married', node: {
        q: 'INCOME;', key: 'income',
        branches: [
          { answer: '< 20.000', test: (v) => (v as number) < 20000, node: { label: 'No' } },
          { answer: '≥ 20.000', test: (v) => (v as number) >= 20000, node: {
            q: 'HOUSE OWNER;', key: 'house',
            branches: [
              { answer: 'No', test: (v) => v === false, node: { label: 'No' } },
              { answer: 'Yes', test: (v) => v === true, node: { label: 'Yes' } },
            ],
          } },
        ],
      } },
    ],
  },
  samples: [
    { id: 'Αιτών 1: Single, 50.000, ιδιοκτήτης', values: { status: 'Single', income: 50000, house: true } },
    { id: 'Αιτών 2: Married, 15.000, ιδιοκτήτης', values: { status: 'Married', income: 15000, house: true } },
    { id: 'Αιτών 3: Married, 30.000, όχι ιδιοκτήτης', values: { status: 'Married', income: 30000, house: false } },
    { id: 'Αιτών 4: Married, 30.000, ιδιοκτήτης', values: { status: 'Married', income: 30000, house: true } },
  ],
};

export const DTREES = [SPAM, LOAN];

/** The path a sample takes: the answers chosen at each question, and the label. */
export function classify(t: DTree, s: Sample): { path: { q: string; answer: string }[]; label: string } {
  const path: { q: string; answer: string }[] = [];
  let n = t.root;
  while (!n.label) {
    const b = n.branches!.find((br) => br.test(s.values[n.key!]!))!;
    path.push({ q: n.q!, answer: b.answer });
    n = b.node;
  }
  return { path, label: n.label };
}

/** The lecture's tenure rule (slides 75–76): IF rank = 'Professor' OR years > 6 THEN tenured = 'Yes'. */
export const tenured = (rank: string, years: number) => (rank === 'Professor' || years > 6 ? 'Yes' : 'No');

export const TENURE_TRAIN: [string, string, number, string][] = [
  ['Anne', 'Lecturer', 3, 'No'], ['Martin', 'Professor', 8, 'Yes'], ['James', 'Senior Lecturer', 6, 'No'],
  ['David', 'Professor', 5, 'Yes'], ['Dave', 'Principal Lecturer', 7, 'Yes'], ['Michael', 'Lecturer', 5, 'No'],
];
export const TENURE_TEST: [string, string, number, string][] = [
  ['Tom', 'Professor', 8, 'Yes'], ['Tim', 'Senior Lecturer', 6, 'No'], ['Chris', 'Professor', 5, 'Yes'], ['Val', 'Principal Lecturer', 7, 'Yes'],
];
