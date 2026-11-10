import { describe, expect, it } from 'vitest';
import {
  apply, bins, classify, CUSTOMERS, decimalScaling, fit, initial, kRun, LECTURE_BASKET, LOAN, minMax, mse, predict, rule,
  run, SHOP, smoothBoundaries, smoothMeans, SPAM, STEPS, STUDY, TENURE_TEST, TENURE_TRAIN, tenured, wcss, zScore,
} from './ml-lab';

const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

describe('regression (§6)', () => {
  it('ŷ = 46,5 + 5,4x and 73,5 for 5 hours', () => {
    const { b0, b1 } = fit(STUDY.x, STUDY.y);
    expect([round(b0), round(b1)]).toEqual([46.5, 5.4]);
    expect(round(predict(b0, b1, 5))).toBe(73.5);
  });
  it('the best line has the smallest MSE (1,05); the flat start at the mean has 37,5', () => {
    const { b0, b1 } = fit(STUDY.x, STUDY.y);
    expect(round(mse(STUDY.x, STUDY.y, b0, b1))).toBe(1.05);
    expect(mse(STUDY.x, STUDY.y, 60, 0)).toBe(37.5);
    for (const [db0, db1] of [[0.5, 0], [-0.5, 0], [0, 0.1], [0, -0.1]]) {
      expect(mse(STUDY.x, STUDY.y, b0 + db0!, b1 + db1!)).toBeGreaterThan(mse(STUDY.x, STUDY.y, b0, b1));
    }
  });
});

describe('scaling and binning (§9 and the lecture)', () => {
  it('min-max, z-score and decimal scaling', () => {
    expect(minMax(28, 18, 58)).toBe(0.25);
    expect(minMax(48, 18, 58)).toBe(0.75);
    expect(minMax(65, 40, 90)).toBe(0.5); // self-check 6
    expect([minMax(30, 30, 50), minMax(50, 30, 50), minMax(35, 30, 50)]).toEqual([0, 1, 0.25]); // slide 68
    expect(Number.isNaN(minMax(5, 5, 5))).toBe(true); // max = min
    expect(zScore(65, 50, 10)).toBe(1.5);
    expect(decimalScaling([-2, 32, 100, 59, 48])).toEqual({ j: 2, out: [-0.02, 0.32, 1, 0.59, 0.48] }); // slide 63
  });
  it('the lesson bins: means 4/12/22, boundaries 2,2,7 / 10,10,15 / 20,20,25', () => {
    const b = bins([2, 3, 7, 10, 11, 15, 20, 21, 25], 3);
    expect(b).toEqual([[2, 3, 7], [10, 11, 15], [20, 21, 25]]);
    expect(smoothMeans(b)).toEqual([[4, 4, 4], [12, 12, 12], [22, 22, 22]]);
    expect(smoothBoundaries(b)).toEqual([[2, 2, 7], [10, 10, 15], [20, 20, 25]]);
  });
  it("the lecture's bins (slide 65): means 9 / 22,75 / 29,25, boundaries as on the slide", () => {
    const b = bins([4, 8, 9, 15, 21, 21, 24, 25, 26, 28, 29, 34], 3);
    expect(smoothMeans(b).map((x) => x[0])).toEqual([9, 22.75, 29.25]);
    expect(smoothBoundaries(b)).toEqual([[4, 4, 4, 15], [21, 21, 25, 25], [26, 26, 26, 34]]);
  });
});

describe('preprocessing lab', () => {
  it('removes the duplicate C and converts D to 99 €', () => {
    const s = run(['dedupe', 'currency']);
    expect(s.rows.map((r) => r.id)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    expect(s.rows.find((r) => r.id === 'D')!.cells.Σύνολο).toBe(99);
    expect(s.columns).not.toContain('Νόμισμα');
  });
  it('age 140 becomes missing; B and E get the training mean 31,5 (31,2 with leakage)', () => {
    const s = run(['dedupe', 'currency', 'outlier', 'impute']);
    expect(s.params.ageMean).toBe(31.5);
    expect(s.rows.filter((r) => r.id === 'B' || r.id === 'E').map((r) => r.cells.Ηλικία)).toEqual([31.5, 31.5]);
    expect(round(run(['dedupe', 'currency', 'outlier', 'impute'], true).params.ageMean!, 1)).toBe(31.2);
  });
  it('min-max learns 45…460 from training: A → 0,18, test G → 1,14 (> 1 is fine)', () => {
    const s = run(['dedupe', 'currency', 'outlier', 'impute', 'onehot', 'minmax']);
    expect([s.params.totalMin, s.params.totalMax]).toEqual([45, 460]);
    expect(round(s.rows.find((r) => r.id === 'A')!.cells.Σύνολο as number)).toBe(0.18);
    expect(round(s.rows.find((r) => r.id === 'G')!.cells.Σύνολο as number)).toBe(1.14);
    // with leakage the max becomes G's 520 and G looks «in range»
    expect(run(['dedupe', 'currency', 'outlier', 'impute', 'onehot', 'minmax'], true).params.totalMax).toBe(520);
  });
  it('one-hot gives three 0/1 columns; z-score of age: μ 31,5, σ ≈ 5,85, A → −1,63', () => {
    const s = run(STEPS);
    expect(s.columns.filter((c) => c.startsWith('Πόλη='))).toHaveLength(3);
    expect(s.rows.find((r) => r.id === 'D')!.cells['Πόλη=Θεσσαλονίκη']).toBe(1);
    expect(s.params.ageMu).toBe(31.5);
    expect(round(s.params.ageSigma!)).toBe(5.85);
    expect(round(s.rows.find((r) => r.id === 'A')!.cells.Ηλικία as number)).toBe(-1.63);
  });
  it('steps are pure: the initial table is untouched', () => {
    const s0 = initial();
    apply(s0, 'dedupe');
    expect(s0.rows).toHaveLength(8);
  });
});

describe('K-Means', () => {
  it('k = 3 from start Α finds the three groups of four', () => {
    const { state, rounds } = kRun(CUSTOMERS, 3, 0);
    const groups = [0, 1, 2].map((k) => CUSTOMERS.filter((_, i) => state.assign[i] === k).map((p) => p.id));
    expect(groups).toEqual([['Π1', 'Π2', 'Π3', 'Π4'], ['Π5', 'Π6', 'Π7', 'Π8'], ['Π9', 'Π10', 'Π11', 'Π12']]);
    expect(rounds).toBeGreaterThanOrEqual(2);
  });
  it('start Β (two centres in one group) gets stuck in a worse result: the initialisation matters', () => {
    const good = kRun(CUSTOMERS, 3, 0).state, bad = kRun(CUSTOMERS, 3, 1).state;
    expect(wcss(CUSTOMERS, bad)).toBeGreaterThan(wcss(CUSTOMERS, good) + 0.01);
  });
});

describe('association rules (§12 and slide 72)', () => {
  it('{καφές} → {ζάχαρη}: support 60%, confidence 100%, lift ≈ 1,67', () => {
    const r = rule(SHOP, ['καφές'], ['ζάχαρη']);
    expect([r.support, r.confidence, round(r.lift)]).toEqual([0.6, 1, 1.67]);
  });
  it('{γάλα} → {καφές} 40% / 67%, {ψωμί} → {γάλα} 40% / 67%', () => {
    const a = rule(SHOP, ['γάλα'], ['καφές']), b = rule(SHOP, ['ψωμί'], ['γάλα']);
    expect([a.support, round(a.confidence)]).toEqual([0.4, 0.67]);
    expect([b.support, round(b.confidence)]).toEqual([0.4, 0.67]);
  });
  it('lecture: {Diapers} → {Beer} 50% / 75%', () => {
    const r = rule(LECTURE_BASKET, ['Diapers'], ['Beer']);
    expect([r.support, r.confidence]).toEqual([0.5, 0.75]);
  });
});

describe('decision trees', () => {
  it('the spam tree gets three emails right and the hacked contact wrong', () => {
    const res = SPAM.samples.map((s) => classify(SPAM, s).label === s.truth);
    expect(res).toEqual([true, true, true, false]);
  });
  it("the lecture's loan tree: only a married home owner with ≥ 20.000 gets Yes", () => {
    expect(LOAN.samples.map((s) => classify(LOAN, s).label)).toEqual(['No', 'No', 'No', 'Yes']);
    expect(classify(LOAN, LOAN.samples[3]!).path.map((p) => p.answer)).toEqual(['Married', '≥ 20.000', 'Yes']);
  });
  it("the lecture's tenure rule fits every training and test row, and George gets Yes", () => {
    for (const [, rank, years, label] of [...TENURE_TRAIN, ...TENURE_TEST]) expect(tenured(rank, years)).toBe(label);
    expect(tenured('Professor', 5)).toBe('Yes');
  });
});

describe('K-Means start Β', () => {
  it('merges the two low-value groups and splits the high-value one', () => {
    const { state } = kRun(CUSTOMERS, 3, 1);
    expect(new Set(state.assign.slice(0, 8)).size).toBe(1);
    expect(new Set(state.assign.slice(8)).size).toBe(2);
  });
});
