import { describe, expect, it } from 'vitest';
import {
  bezout, bruteForce, caesar, capacity, isFindTheTrio, isFindTheTrioEuclid, isGoldExercise, joinOut, lsbEmbed, lsbExtract,
  mod, modInverse, modPow, rsaKeys, vigenere,
} from './crypto-lab';

describe('Caesar / shift cipher', () => {
  it('CAT with K = 3 is FDW; DOG with K = 5 is ITL', () => {
    expect(joinOut(caesar('CAT', 3))).toBe('FDW');
    expect(joinOut(caesar('DOG', 5))).toBe('ITL');
  });
  it('wraps around: Y (24) + 3 = 27 mod 26 = 1 = B', () => {
    const [s] = caesar('Y', 3);
    expect(s).toMatchObject({ output: 'B', raw: 27, wrapped: true });
  });
  it('decrypts G with 3 to D, and keeps case and spaces', () => {
    expect(joinOut(caesar('G', 3, true))).toBe('D');
    expect(joinOut(caesar('Hello, World', 3))).toBe('Khoor, Zruog');
  });
  it('lecture: «we will meet at midnight» with K = 11', () => {
    expect(joinOut(caesar('wewillmeetatmidnight', 11)).toUpperCase()).toBe('HPHTWWXPPELEXTOYTRSE');
  });
  it('lecture brute force: K = 4 reveals «if we wish to replace letter»', () => {
    expect(bruteForce('mjaiamwlxsvitpegipixxiv')[4]!.text).toBe('ifwewishtoreplaceletter');
  });
  it('29 mod 26 = 3 and −3 mod 26 = 23', () => {
    expect(mod(29, 26)).toBe(3);
    expect(mod(-3, 26)).toBe(23);
  });
  it('rejects keys outside 0–25', () => {
    expect(() => caesar('A', 26)).toThrow(RangeError);
  });
});

describe('Vigenère', () => {
  it('CAT with key KEY is MER', () => {
    expect(joinOut(vigenere('CAT', 'KEY'))).toBe('MER');
  });
  it('lecture: CIPHER over «thiscryptosystemisnotsecure»', () => {
    expect(joinOut(vigenere('thiscryptosystemisnotsecure', 'CIPHER')).toUpperCase()).toBe('VPXZGIAXIVWPUBTTMJPWIZITWZT');
  });
  it('the key advances only on letters, and decryption inverts', () => {
    const c = joinOut(vigenere('ab cd', 'BC'));
    expect(c).toBe('bd df');
    expect(joinOut(vigenere(c, 'BC', true))).toBe('ab cd');
  });
  it('spots the lecture exercise (gold)', () => {
    expect(isGoldExercise('proceed meeting as agreed', 'GOLD')).toBe(true);
    expect(isGoldExercise('proceed', 'gold')).toBe(true);
    expect(isGoldExercise('proceed meeting', 'key')).toBe(false);
    expect(isGoldExercise('pro', 'gold')).toBe(false);
  });
});

describe('Euclid and Bézout', () => {
  it('lecture: gcd(77, 2592) = 1, 101×77 − 3×2592 = 1', () => {
    const b = bezout(77, 2592);
    expect(b.gcd).toBe(1);
    expect(b.divisions.map((d) => [d.a, d.q, d.b, d.r])).toEqual([
      [2592, 33, 77, 51], [77, 1, 51, 26], [51, 1, 26, 25], [26, 1, 25, 1], [25, 25, 1, 0],
    ]);
    expect(b.x * 2592 + b.y * 77).toBe(1);
    expect(b.lines).toEqual([
      '1 = 26 − 25',
      '  = 26 − (51 − 26)',
      '  = 2×26 − 51',
      '  = 2×(77 − 51) − 51',
      '  = 2×77 − 3×51',
      '  = 2×77 − 3×(2592 − 33×77)',
      '  = 101×77 − 3×2592',
    ]);
  });
  it('the inverse of 77 mod 2592 is 101', () => {
    expect(modInverse(77, 2592)).toBe(101);
  });
  it('self-check: 3 mod 40 has inverse 27', () => {
    expect(modInverse(3, 40)).toBe(27);
  });
  it('no inverse when gcd ≠ 1', () => {
    expect(bezout(12, 18).gcd).toBe(6);
    expect(modInverse(6, 40)).toBeNull();
  });
  it('identity holds for many pairs, and for a divisor', () => {
    for (const [a, b] of [[240, 46], [17, 3120], [99, 78], [5, 25]] as const) {
      const r = bezout(a, b);
      expect(r.x * r.big + r.y * r.small).toBe(r.gcd);
    }
  });
  it('rejects non-positive input', () => {
    expect(() => bezout(0, 5)).toThrow(RangeError);
    expect(() => bezout(-3, 5)).toThrow(RangeError);
  });
});

describe('RSA (textbook)', () => {
  it('lecture keys: p = 37, q = 73, e = 77 → N = 2701, φ = 2592, d = 101', () => {
    const k = rsaKeys(37, 73, 77);
    expect(k).toMatchObject({ N: 2701, phi: 2592, d: 101 });
  });
  it('lecture blocks: 0812 0818 1824 1420 → 1744 0321 0656 2064, and back', () => {
    const blocks = [812n, 818n, 1824n, 1420n];
    const c = blocks.map((p) => modPow(p, 77n, 2701n).value);
    expect(c).toEqual([1744n, 321n, 656n, 2064n]);
    expect(c.map((x) => modPow(x, 101n, 2701n).value)).toEqual(blocks);
  });
  it('one-way example: 88^7 mod 187 = 11', () => {
    expect(modPow(88n, 7n, 187n).value).toBe(11n);
  });
  it('square-and-multiply has one step per bit of the exponent', () => {
    expect(modPow(5n, 77n, 2701n).steps).toHaveLength(77n.toString(2).length);
  });
  it('validates the inputs', () => {
    expect(rsaKeys(36, 73, 77)).toEqual({ error: 'p-not-prime' });
    expect(rsaKeys(37, 37, 5)).toEqual({ error: 'p-equals-q' });
    expect(rsaKeys(37, 73, 2592)).toEqual({ error: 'e-range' });
    expect(rsaKeys(37, 73, 6)).toEqual({ error: 'e-not-coprime' });
  });
  it('refuses the «Find the trio» exercise numbers, in either order', () => {
    expect(rsaKeys(41, 61, 47)).toEqual({ error: 'exercise' });
    expect(rsaKeys(61, 41, 47)).toEqual({ error: 'exercise' });
    expect(isFindTheTrio(41, 61, 7)).toBe(false);
    expect(isFindTheTrioEuclid(47, 2400)).toBe(true);
    expect(isFindTheTrioEuclid(2400, 47)).toBe(true);
  });
});

describe('LSB', () => {
  it('lecture pixel (91, 62, 95) with bits 0, 1, 0 → (90, 63, 94)', () => {
    const out = lsbEmbed([91, 62, 95], [0, 1, 0]);
    expect(out).toEqual([90, 63, 94]);
    expect(lsbExtract(out)).toEqual([0, 1, 0]);
  });
  it('self-check: bit 1 into 200 gives 201', () => {
    expect(lsbEmbed([200, 0, 0], [1, 0, 0])[0]).toBe(201);
  });
  it('capacity: 1024 × 768 → 2.359.296 bit = 294.912 bytes = 288 KiB; 100 × 100 → 30.000 bit', () => {
    expect(capacity(1024, 768)).toEqual({ bits: 2359296, bytes: 294912, kib: 288 });
    expect(capacity(100, 100).bits).toBe(30000);
  });
  it('rejects channel values outside 0–255', () => {
    expect(() => lsbEmbed([256, 0, 0], [0, 0, 0])).toThrow(RangeError);
  });
});
