/**
 * Post-build sanity checks on the generated HTML in dist/.
 *
 * Astro can log a Markdown render error and still finish "successfully",
 * leaving an empty brief on the page. This catches that, duplicate element
 * ids, and code-highlighting colours below WCAG AA on our code background,
 * and fails the build so CI goes red instead of shipping it.
 *
 * Run automatically by `npm run build`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = 'dist';
const problems = [];

// Code blocks sit on --panel-sunken (tokens.css); keep these in sync.
const CODE_BG = { light: '#eaf5fb', dark: '#0b2738' };
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const codeColours = { light: new Set(), dark: new Set() };

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (p.endsWith('.html')) yield p;
  }
}

for (const file of htmlFiles(DIST)) {
  const html = readFileSync(file, 'utf8');
  const page = '/' + relative(DIST, file);

  const counts = new Map();
  for (const [, id] of html.matchAll(/\sid="([^"]+)"/g)) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const [id, n] of counts) if (n > 1) problems.push(`${page}: id "${id}" appears ${n} times`);

  for (const [, mode, hex] of html.matchAll(/--shiki-(light|dark):(#[0-9a-fA-F]{6})/g)) {
    codeColours[mode].add(hex.toLowerCase());
  }

  for (const [, inner] of html.matchAll(/<details class="brief[^>]*>([\s\S]*?)<\/details>/g)) {
    const text = inner.replace(/<[^>]+>/g, '').replace('Εκφώνηση', '').trim();
    if (text.length === 0) problems.push(`${page}: an assignment brief rendered empty`);
  }
}

for (const mode of ['light', 'dark']) {
  for (const hex of codeColours[mode]) {
    const ratio = contrast(hex, CODE_BG[mode]);
    if (ratio < 4.5) problems.push(`code colour ${hex} is ${ratio.toFixed(2)}:1 on the ${mode} code background (needs 4.5)`);
  }
}

if (problems.length) {
  console.error(`\nBuild check failed (${problems.length}):\n` + problems.map((p) => `  ✖ ${p}`).join('\n') + '\n');
  process.exit(1);
}
console.log('Build check passed: no duplicate ids, no empty briefs, code colours ≥ 4.5:1.');
