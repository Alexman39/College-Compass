/**
 * Arithmetic for the CN6003 Week 3 labs (Caesar, Vigenère, Euclid/Bézout,
 * RSA, LSB). Latin alphabet A = 0 … Z = 25; other characters pass through.
 * RSA here is textbook RSA, for teaching only.
 */

export const mod = (a: number, n: number) => ((a % n) + n) % n;

const A = 'A'.charCodeAt(0);
const isLetter = (c: string) => /^[A-Za-z]$/.test(c);
const num = (c: string) => c.toUpperCase().charCodeAt(0) - A;
const chr = (n: number, lower: boolean) => {
  const c = String.fromCharCode(A + n);
  return lower ? c.toLowerCase() : c;
};

export interface CharStep {
  input: string;
  output: string;
  /** Letter number before the shift (undefined for non-letters). */
  x?: number;
  shift?: number;
  /** x ± shift before mod 26. */
  raw?: number;
  /** The shift wrapped around the alphabet (raw outside 0–25). */
  wrapped?: boolean;
  /** Vigenère: the key letter used. */
  keyLetter?: string;
}

function shiftChar(c: string, k: number, decrypt: boolean): CharStep {
  if (!isLetter(c)) return { input: c, output: c };
  const x = num(c);
  const raw = decrypt ? x - k : x + k;
  const y = mod(raw, 26);
  return { input: c, output: chr(y, c === c.toLowerCase()), x, shift: k, raw, wrapped: raw < 0 || raw > 25 };
}

export function caesar(text: string, k: number, decrypt = false): CharStep[] {
  if (!Number.isInteger(k) || k < 0 || k > 25) throw new RangeError('key is an integer 0–25');
  return [...text].map((c) => shiftChar(c, k, decrypt));
}

export const joinOut = (steps: CharStep[]) => steps.map((s) => s.output).join('');

/** All 26 decryptions (brute force). */
export function bruteForce(cipher: string): { key: number; text: string }[] {
  return Array.from({ length: 26 }, (_, k) => ({ key: k, text: joinOut(caesar(cipher, k, true)) }));
}

export function vigenere(text: string, key: string, decrypt = false): CharStep[] {
  const shifts = [...key].filter(isLetter).map(num);
  if (!shifts.length) throw new RangeError('the key needs at least one Latin letter');
  const letters = [...key].filter(isLetter).map((c) => c.toUpperCase());
  let i = 0;
  return [...text].map((c) => {
    if (!isLetter(c)) return { input: c, output: c };
    const s = shiftChar(c, shifts[i % shifts.length]!, decrypt);
    s.keyLetter = letters[i % letters.length];
    i++;
    return s;
  });
}

// ---- Euclid and Bézout ----

export interface Division { a: number; q: number; b: number; r: number }

export interface Bezout {
  divisions: Division[];
  gcd: number;
  /** Back-substitution lines, each «gcd = x·A + y·B» (already formatted). */
  lines: string[];
  /** gcd = x·big + y·small */
  x: number;
  y: number;
  big: number;
  small: number;
}

type Part = { c: number; v: string };

/** «101×77 − 3×2592»: positive terms first, coefficient 1 left out. */
function fmt(parts: Part[]): string {
  const ordered = [...parts.filter((p) => p.c > 0), ...parts.filter((p) => p.c < 0)];
  return ordered
    .map((p, i) => {
      const abs = Math.abs(p.c);
      const body = abs === 1 ? p.v : `${abs}×${p.v}`;
      if (i === 0) return p.c < 0 ? `−${body}` : body;
      return p.c < 0 ? ` − ${body}` : ` + ${body}`;
    })
    .join('');
}

/** Extended Euclid for positive integers, with the lecture's back-substitution. */
export function bezout(m: number, n: number): Bezout {
  if (![m, n].every((v) => Number.isInteger(v) && v > 0)) throw new RangeError('both numbers must be positive integers');
  const big = Math.max(m, n), small = Math.min(m, n);
  const divisions: Division[] = [];
  let a = big, b = small;
  while (b !== 0) {
    const q = Math.floor(a / b), r = a % b;
    divisions.push({ a, q, b, r });
    a = b; b = r;
  }
  const g = a;
  if (divisions.length === 1) {
    // small divides big: gcd = small = 0×big + 1×small
    return { divisions, gcd: g, lines: [`${g} = ${small}`], x: 0, y: 1, big, small };
  }
  // the gcd is the remainder of the second-to-last division: A = q·B + gcd
  const last = divisions[divisions.length - 2]!;
  let A = last.a, x = 1, y = -last.q;
  const lines = [`${g} = ${fmt([{ c: x, v: String(A) }, { c: y, v: String(last.b) }])}`];
  for (let i = divisions.length - 3; i >= 0; i--) {
    // the smaller number in «x·A + y·B» is the remainder of division i: B = d.a − d.q·A
    const d = divisions[i]!;
    const inner = d.q === 1 ? `${d.a} − ${A}` : `${d.a} − ${d.q}×${A}`;
    lines.push(`  = ${fmt([{ c: x, v: String(A) }, { c: y, v: `(${inner})` }])}`);
    const nx = y, ny = x - y * d.q; // coefficients of d.a and A
    A = d.a; x = nx; y = ny;
    lines.push(`  = ${fmt([{ c: x, v: String(A) }, { c: y, v: String(d.b) }])}`);
  }
  return { divisions, gcd: g, lines, x, y, big, small };
}

/** Inverse of e modulo m, or null when gcd(e, m) ≠ 1. */
export function modInverse(e: number, m: number): number | null {
  const b = bezout(e, m);
  if (b.gcd !== 1) return null;
  const coef = b.big === e ? b.x : b.y;
  return mod(coef, m);
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export function isPrime(n: number): boolean {
  if (!Number.isInteger(n) || n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}

// ---- RSA (textbook, for teaching only) ----

export interface PowStep { bit: string; square: bigint; multiply?: bigint; result: bigint }

/** base^exp mod m by left-to-right square-and-multiply, with the steps. */
export function modPow(base: bigint, exp: bigint, m: bigint): { value: bigint; steps: PowStep[] } {
  if (m <= 0n) throw new RangeError('modulus must be positive');
  const bits = exp.toString(2);
  let r = 1n;
  const b = ((base % m) + m) % m;
  const steps: PowStep[] = [];
  for (const bit of bits) {
    const sq = (r * r) % m;
    r = sq;
    let mul: bigint | undefined;
    if (bit === '1') { r = (r * b) % m; mul = r; }
    steps.push({ bit, square: sq, multiply: mul, result: r });
  }
  return { value: r, steps };
}

export type RsaError =
  | 'p-not-prime' | 'q-not-prime' | 'p-equals-q' | 'e-range' | 'e-not-coprime' | 'P-range' | 'exercise';

export interface RsaKeys { p: number; q: number; N: number; phi: number; e: number; d: number; euclid: Bezout }

/**
 * The «Find the trio» Security exercise (p = 41, q = 61, e = 47) is graded
 * work: the lab refuses those numbers so it does not hand out the answer.
 */
export function isFindTheTrio(p: number, q: number, e: number): boolean {
  return e === 47 && ((p === 41 && q === 61) || (p === 61 && q === 41));
}

export function rsaKeys(p: number, q: number, e: number): RsaKeys | { error: RsaError } {
  if (isFindTheTrio(p, q, e)) return { error: 'exercise' };
  if (!isPrime(p)) return { error: 'p-not-prime' };
  if (!isPrime(q)) return { error: 'q-not-prime' };
  if (p === q) return { error: 'p-equals-q' };
  const N = p * q, phi = (p - 1) * (q - 1);
  if (!Number.isInteger(e) || e <= 1 || e >= phi) return { error: 'e-range' };
  if (gcd(e, phi) !== 1) return { error: 'e-not-coprime' };
  const d = modInverse(e, phi)!;
  return { p, q, N, phi, e, d, euclid: bezout(e, phi) };
}

/** The same exercise through the Euclid lab: gcd(47, 2400). */
export const isFindTheTrioEuclid = (a: number, b: number) =>
  (a === 47 && b === 2400) || (a === 2400 && b === 47);

/** The lecture's Vigenère exercise («proceed meeting as agreed», key gold). */
export function isGoldExercise(text: string, key: string): boolean {
  const t = text.toLowerCase().replace(/[^a-z]/g, '');
  return key.toLowerCase().replace(/[^a-z]/g, '') === 'gold' && t.length >= 7 && 'proceedmeetingasagreed'.startsWith(t);
}

// ---- LSB ----

export const bin8 = (v: number) => v.toString(2).padStart(8, '0');

export function lsbEmbed(pixel: [number, number, number], bits: [0 | 1, 0 | 1, 0 | 1]): [number, number, number] {
  return pixel.map((v, i) => {
    if (!Number.isInteger(v) || v < 0 || v > 255) throw new RangeError('channel values are 0–255');
    return (v & ~1) | bits[i]!;
  }) as [number, number, number];
}

export const lsbExtract = (pixel: number[]) => pixel.map((v) => v & 1);

export function capacity(width: number, height: number, bitsPerChannel = 1) {
  const bits = width * height * 3 * bitsPerChannel;
  return { bits, bytes: bits / 8, kib: bits / 8 / 1024 };
}
