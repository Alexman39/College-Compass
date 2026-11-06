import { describe, expect, it } from 'vitest';
import { AttackTreeError, cheapest, describe as describeTree, format, nodes, parse, parseNumber, render } from './attack-tree';

const SAFE = `mode: cost
unit: $

Άνοιξε το χρηματοκιβώτιο | OR = 10.000
  Παραβίασε την κλειδαριά | 30.000 | ΕΕ
  Μάθε τον συνδυασμό | OR = 20.000
    Βρες τον συνδυασμό γραμμένο κάπου | 75.000
    Πάρε τον από τον κάτοχο | OR = 20.000
      Απείλησε | 60.000
      Εκβίασε | 100.000
      Κρυφάκουσε | AND = 60.000
        Άκου τη συνομιλία | 20.000 | ΕΕ
        Κάνε τον να πει τον συνδυασμό | 40.000
      Δωροδόκησε | 20.000
  Κόψε το χρηματοκιβώτιο | 10.000 | ΕΕ
  Εκμεταλλεύσου κακή εγκατάσταση | 100.000`;

const COMPANY = `mode: probability

Πρόσβαση στα δεδομένα | OR = 0,802
  Κλοπή credentials | OR = 0,496
    spear phishing | 0,30
    keylogger | 0,20
    κοινωνική μηχανική | 0,10
  Εκμετάλλευση ευπάθειας | OR = 0,490
    unpatched SMB | 0,25
    zero-day | 0,15
    custom malware | 0,20
  Φυσική πρόσβαση | OR = 0,231
    είσοδος στο κτίριο | 0,05
    κλοπή κάρτας | 0,10
    tailgating | 0,10`;

describe('attack trees', () => {
  it('reads Greek numbers', () => {
    expect([parseNumber('10.000'), parseNumber('0,30'), parseNumber('100'), parseNumber('1.234.567')]).toEqual([10000, 0.3, 100, 1234567]);
    expect(() => parseNumber('δέκα')).toThrow(AttackTreeError);
  });

  it('computes costs: OR = the cheapest child, AND = the sum (the safe of Schneier)', () => {
    const t = parse(SAFE);
    const by = (l: string) => nodes(t).find((n) => n.label === l)!;
    expect(t.root.value).toBe(10000);
    expect(by('Κρυφάκουσε').value).toBe(60000);
    expect(by('Πάρε τον από τον κάτοχο').value).toBe(20000);
    expect([...cheapest(t)].map((n) => n.label)).toEqual(['Άνοιξε το χρηματοκιβώτιο', 'Κόψε το χρηματοκιβώτιο']);
    expect(format(t, 10000)).toBe('10.000 $');
  });

  it('computes probabilities under independence (the lecture\'s company Χ)', () => {
    const t = parse(COMPANY);
    expect(t.root.value).toBeCloseTo(0.802, 3);
    expect(format(t, t.root.value!)).toBe('0,802');
    expect(format(t, 0.3)).toBe('0,30');
    expect(format(t, 1 - 0.95 * 0.9 * 0.9)).toBe('0,231');
    expect(format(t, 0.49, true)).toBe('0,490');
    expect(format(t, 0.0005, true)).toBe('0,0005');
  });

  it('fails when a written value does not match its children', () => {
    expect(() => parse(SAFE.replace('OR = 20.000\n    Βρες', 'OR = 25.000\n    Βρες'))).toThrow(/written as 25\.000 \$ but its children give 20\.000 \$/);
    expect(() => parse(COMPANY.replace('0,496', '0,5'))).toThrow(AttackTreeError);
  });

  it('rejects malformed trees', () => {
    expect(() => parse('mode: cost\n\nA | OR\n')).toThrow(/has no children/);
    expect(() => parse('mode: cost\n\nA | OR\n  B\n')).toThrow(/needs a value/);
    expect(() => parse('mode: probability\n\nA | OR\n  B | 1,5\n')).toThrow(/between 0 and 1/);
    expect(() => parse('mode: none\n\nA | OR\n  B | OR\n      C\n')).toThrow(/indented too far/);
    expect(() => parse('colour: red\n\nA | 1\n')).toThrow(/unknown setting/);
    expect(() => parse('highlight: Z\n\nA | OR\n  B | 1\n')).toThrow(/no node is called/);
  });

  it('hides computed values when they are an exercise', () => {
    const svg = render(parse(`values: leaves\n${COMPANY}`));
    expect(svg).toContain('0,30');
    expect(svg).not.toContain('0,802');
    expect(svg).not.toContain('0,496');
  });

  it('draws valid SVG in both layouts and escapes text', () => {
    for (const layout of ['list', 'tree']) {
      const svg = render(parse(`layout: ${layout}\nmode: none\n\nA & B <x> | OR\n  C | \n  D\n`));
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).toContain('A &amp; B &lt;x&gt;');
      expect(svg).not.toMatch(/<x>/);
    }
  });

  it('writes a description for screen readers', () => {
    const d = describeTree(parse(SAFE));
    expect(d).toContain('Άνοιξε το χρηματοκιβώτιο (OR), 10.000 $');
    expect(d).toContain('Κρυφάκουσε (AND), 60.000 $');
    expect(d).toContain('Τονισμένα: Κόψε το χρηματοκιβώτιο');
  });
});
