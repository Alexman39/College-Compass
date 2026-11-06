/**
 * Attack trees: parse the text format, compute the values, lay the tree out
 * and draw it as SVG. Used at build time by the ```attack-tree Markdown block
 * (src/lib/markdown/attack-tree.ts) and in the browser by the attack-tree
 * explorer (src/scripts/demos/attack-tree.ts), so both always agree.
 *
 * The format (header lines, a blank line, then one node per line; two spaces
 * of indentation per level):
 *
 *   mode: cost                 cost | probability | none
 *   unit: $                    shown after costs
 *   values: all                all | leaves  (leaves: hide computed values,
 *                              e.g. when they are an exercise)
 *   highlight: Κόψε, Δωροδόκησε   nodes to highlight (default in cost mode:
 *                              the cheapest attack)
 *   layout: list               list (indented, phone-friendly) | tree
 *   note: ΕΕ = ειδικός εξοπλισμός    one line under the diagram (repeatable)
 *
 *   Άνοιξε το χρηματοκιβώτιο | OR = 10.000
 *     Παραβίασε την κλειδαριά | 30.000 | ΕΕ
 *     Μάθε τον συνδυασμό | OR
 *       …
 *
 * A node is «label | spec | tags». A leaf's spec is its value; an inner
 * node's spec is OR or AND, optionally «= value» that the computed value
 * must match (a mismatch is an error, so a typo can't reach the site).
 * Numbers may be written the Greek way: 10.000 and 0,30.
 *
 * Values: cost — OR takes the cheapest child, AND adds them up.
 * Probability — OR = 1 − Π(1 − pᵢ), AND = Π pᵢ, assuming independent events.
 */

export type Mode = 'cost' | 'probability' | 'none';
export type Gate = 'OR' | 'AND';

export interface AttackNode {
  label: string;
  gate?: Gate;
  /** Given value: a leaf's value, or the expected value of an inner node. */
  given?: number;
  /** Computed value (= given for leaves). */
  value?: number;
  tags: string[];
  children: AttackNode[];
  depth: number;
  /** Position in the tree, root first, depth-first. */
  index: number;
}

export interface AttackTree {
  mode: Mode;
  unit: string;
  values: 'all' | 'leaves';
  highlight?: string[];
  layout: 'list' | 'tree';
  notes: string[];
  root: AttackNode;
}

export class AttackTreeError extends Error {}

/** "10.000" → 10000, "0,30" → 0.3, "1,5" → 1.5, "30000" → 30000. */
export function parseNumber(s: string): number {
  const t = s.trim().replace(/\s/g, '');
  if (!/^\d[\d.,]*$/.test(t)) throw new AttackTreeError(`«${s}» is not a number`);
  // Greek: "." groups thousands, "," is the decimal point.
  const n = Number(t.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  if (Number.isNaN(n)) throw new AttackTreeError(`«${s}» is not a number`);
  return n;
}

export function parse(text: string): AttackTree {
  const lines = text.replace(/\t/g, '  ').split('\n');
  const tree: Omit<AttackTree, 'root'> = { mode: 'cost', unit: '', values: 'all', layout: 'list', notes: [] };
  let i = 0;
  // header
  for (; i < lines.length && lines[i]!.trim() !== ''; i++) {
    const m = /^\s*([a-z]+)\s*:\s*(.*)$/.exec(lines[i]!);
    if (!m) break; // no header: the tree starts right away
    const [, key, val] = m as unknown as [string, string, string];
    if (key === 'mode') {
      if (!['cost', 'probability', 'none'].includes(val)) throw new AttackTreeError(`mode must be cost, probability or none, not «${val}»`);
      tree.mode = val as Mode;
    } else if (key === 'unit') tree.unit = val;
    else if (key === 'values') {
      if (val !== 'all' && val !== 'leaves') throw new AttackTreeError('values must be all or leaves');
      tree.values = val;
    } else if (key === 'highlight') tree.highlight = val.split(',').map((x) => x.trim()).filter(Boolean);
    else if (key === 'layout') {
      if (val !== 'list' && val !== 'tree') throw new AttackTreeError('layout must be list or tree');
      tree.layout = val;
    } else if (key === 'note') tree.notes.push(val);
    else throw new AttackTreeError(`unknown setting «${key}»`);
  }

  // nodes
  const stack: AttackNode[] = [];
  let root: AttackNode | undefined;
  let index = 0;
  let unitIndent: number | undefined;
  for (; i < lines.length; i++) {
    const raw = lines[i]!;
    if (!raw.trim()) continue;
    const indent = raw.length - raw.trimStart().length;
    if (indent > 0 && unitIndent === undefined) unitIndent = indent;
    if (indent % (unitIndent ?? 1) !== 0) throw new AttackTreeError(`line ${i + 1}: uneven indentation`);
    const depth = indent / (unitIndent ?? 1);
    const [label = '', spec = '', tags = ''] = raw.trim().split('|').map((x) => x.trim());
    if (!label) throw new AttackTreeError(`line ${i + 1}: a node needs a label`);
    const node: AttackNode = { label, tags: tags ? tags.split(',').map((x) => x.trim()) : [], children: [], depth, index: index++ };
    const gate = /^(OR|AND)\b\s*(?:=\s*(.+))?$/.exec(spec);
    if (gate) {
      node.gate = gate[1] as Gate;
      if (gate[2]) node.given = parseNumber(gate[2]);
    } else if (spec) node.given = parseNumber(spec);
    if (depth === 0) {
      if (root) throw new AttackTreeError(`line ${i + 1}: only one root is allowed`);
      root = node;
    } else {
      const parent = stack[depth - 1];
      if (!parent) throw new AttackTreeError(`line ${i + 1}: indented too far`);
      parent.children.push(node);
    }
    stack.length = depth;
    stack[depth] = node;
  }
  if (!root) throw new AttackTreeError('the tree is empty');
  const full = { ...tree, root };
  validate(full);
  evaluate(full);
  return full;
}

function validate(tree: AttackTree) {
  for (const n of nodes(tree)) {
    if (n.children.length && !n.gate) throw new AttackTreeError(`«${n.label}» has children, so it needs OR or AND`);
    if (!n.children.length && n.gate) throw new AttackTreeError(`«${n.label}» is ${n.gate} but has no children`);
    if (tree.mode !== 'none' && !n.children.length && n.given === undefined)
      throw new AttackTreeError(`leaf «${n.label}» needs a value`);
    if (tree.mode === 'probability' && n.given !== undefined && (n.given < 0 || n.given > 1))
      throw new AttackTreeError(`«${n.label}»: a probability must be between 0 and 1`);
  }
  for (const h of tree.highlight ?? []) {
    if (!nodes(tree).some((n) => n.label === h)) throw new AttackTreeError(`highlight: no node is called «${h}»`);
  }
}

/** All nodes, root first, depth-first. */
export function nodes(tree: AttackTree): AttackNode[] {
  const out: AttackNode[] = [];
  const walk = (n: AttackNode) => {
    out.push(n);
    n.children.forEach(walk);
  };
  walk(tree.root);
  return out;
}

/** Compute every inner node's value from its children; check given values. */
export function evaluate(tree: AttackTree, { check = true } = {}): void {
  if (tree.mode === 'none') return;
  const calc = (n: AttackNode): number => {
    if (!n.children.length) return (n.value = n.given!);
    const vs = n.children.map(calc);
    let v: number;
    if (tree.mode === 'cost') v = n.gate === 'OR' ? Math.min(...vs) : vs.reduce((a, b) => a + b, 0);
    else v = n.gate === 'AND' ? vs.reduce((a, b) => a * b, 1) : 1 - vs.reduce((a, b) => a * (1 - b), 1);
    n.value = v;
    if (check && n.given !== undefined) {
      const tolerance = tree.mode === 'cost' ? 1e-9 : 5e-4;
      if (Math.abs(n.given - v) > tolerance)
        throw new AttackTreeError(`«${n.label}» is written as ${format(tree, n.given)} but its children give ${format(tree, v, true)}`);
    }
    return v;
  };
  calc(tree.root);
}

/** Nodes of the cheapest attack (cost mode): OR follows the cheapest child, AND needs all. */
export function cheapest(tree: AttackTree): Set<AttackNode> {
  const out = new Set<AttackNode>();
  const walk = (n: AttackNode) => {
    out.add(n);
    if (!n.children.length) return;
    if (n.gate === 'AND') n.children.forEach(walk);
    else walk(n.children.reduce((a, b) => (b.value! < a.value! ? b : a)));
  };
  if (tree.mode === 'cost') walk(tree.root);
  return out;
}

/** Nodes of the likeliest attack (probability mode): OR follows the likeliest child, AND needs all. */
export function likeliest(tree: AttackTree): Set<AttackNode> {
  const out = new Set<AttackNode>();
  const walk = (n: AttackNode) => {
    out.add(n);
    if (!n.children.length) return;
    if (n.gate === 'AND') n.children.forEach(walk);
    else walk(n.children.reduce((a, b) => (b.value! > a.value! ? b : a)));
  };
  if (tree.mode === 'probability') walk(tree.root);
  return out;
}

/** How a node's value comes from its children, e.g. «OR: 1 − (1 − 0,30)(1 − 0,20) = 0,44». */
export function formula(tree: AttackTree, n: AttackNode): string {
  if (!n.children.length || tree.mode === 'none') return '';
  const f = (c: AttackNode) => format(tree, c.value!, c.children.length > 0);
  const vs = n.children.map(f);
  const r = format(tree, n.value!, true);
  if (tree.mode === 'cost') return n.gate === 'OR' ? `OR: min(${vs.join(', ')}) = ${r}` : `AND: ${vs.join(' + ')} = ${r}`;
  return n.gate === 'AND' ? `AND: ${vs.join(' × ')} = ${r}` : `OR: 1 − ${n.children.map((c) => `(1 − ${f(c)})`).join('')} = ${r}`;
}

export function highlighted(tree: AttackTree): Set<AttackNode> {
  if (tree.highlight) return new Set(nodes(tree).filter((n) => tree.highlight!.includes(n.label)));
  return cheapest(tree);
}

/**
 * 10000 → "10.000 $"; probabilities the Greek way. A given value keeps two
 * decimals when it has no more (0,30); a computed one always shows three
 * (0,490), or four when it is tiny (0,0005), so it never rounds to 0.
 */
export function format(tree: Pick<AttackTree, 'mode' | 'unit'>, v: number, computed = false): string {
  if (tree.mode === 'probability') {
    // 1e-9 guards against 0,2305 being stored as 0,23049999…
    if (computed) return (Math.round(v * (v < 0.01 ? 1e4 : 1e3) + 1e-9) / (v < 0.01 ? 1e4 : 1e3)).toFixed(v < 0.01 ? 4 : 3).replace('.', ',');
    const r = Math.round(v * 1000 + 1e-9) / 1000;
    const twoPlaces = Math.abs(r * 100 - Math.round(r * 100)) < 1e-6;
    return r.toFixed(twoPlaces ? 2 : 3).replace('.', ',');
  }
  const s = Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return tree.unit ? `${s} ${tree.unit}` : s;
}

/** What a node shows: its value (unless hidden) and its tags. */
export function shownValue(tree: AttackTree, n: AttackNode): string {
  const parts: string[] = [];
  const hide = tree.values === 'leaves' && n.children.length > 0;
  if (tree.mode !== 'none' && n.value !== undefined && !hide) parts.push(format(tree, n.value, n.children.length > 0));
  parts.push(...n.tags);
  return parts.join(' · ');
}

/** A text description for screen readers (the image's alt text). */
export function describe(tree: AttackTree): string {
  const line = (n: AttackNode): string => {
    const v = shownValue(tree, n);
    const head = `${n.label}${n.gate ? ` (${n.gate})` : ''}${v ? `, ${v}` : ''}`;
    return n.children.length ? `${head}: ${n.children.map(line).join('· ')}` : head;
  };
  const hl = [...highlighted(tree)].filter((n) => !n.children.length).map((n) => n.label);
  return `Δέντρο επιθέσεων. ${line(tree.root)}.${hl.length ? ` Τονισμένα: ${hl.join(', ')}.` : ''}`;
}

// ---- Drawing -----------------------------------------------------------------

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Rough text width for the site's sans-serif (Greek and Latin alike). */
const textWidth = (s: string, size: number, bold = false) => s.length * size * (bold ? 0.6 : 0.55);

function wrap(s: string, maxWidth: number, size: number, bold = false): string[] {
  const out: string[] = [];
  let cur = '';
  for (const w of s.split(/\s+/)) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && textWidth(next, size, bold) > maxWidth) {
      out.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}

export interface RenderOptions {
  /** static: fixed colours and a white card (lesson images). css: classes only, styled by the page (explorer). */
  theme?: 'static' | 'css';
  /** Explorer: the selected node's index. */
  selected?: number;
  /** Override the highlighted nodes. */
  highlight?: Set<AttackNode>;
  /** Explorer: nodes are focusable buttons. */
  interactive?: boolean;
}

const STATIC_STYLE = `
.at-bg{fill:#fff}
.at-edge{fill:none;stroke:#7b8a94;stroke-width:1.8}
.at-box{fill:#fff;stroke:#7b8a94;stroke-width:1.5}
.at-node.inner .at-box{fill:#eef3f6}
.at-node.hl .at-box{fill:#f3e6f4;stroke:#841387;stroke-width:2.5}
.at-label{fill:#0c2636;font-size:15px}
.at-node.inner .at-label,.at-node.hl .at-label{font-weight:700}
.at-value{fill:#0c2636;font-size:15px;font-weight:800}
.at-node.hl .at-value{fill:#841387}
.at-gate rect{fill:#fff;stroke:#0c2636;stroke-width:1.5}
.at-gate text{fill:#0c2636;font-size:12px;font-weight:800}
.at-gate.and rect{fill:#0c2636}
.at-gate.and text{fill:#fff}
.at-note{fill:#4a5a65;font-size:14px}`;

/** The tree as an SVG string. */
export function render(tree: AttackTree, opts: RenderOptions = {}): string {
  return tree.layout === 'tree' ? renderTree(tree, opts) : renderList(tree, opts);
}

function frame(w: number, h: number, body: string[], tree: AttackTree, opts: RenderOptions) {
  const theme = opts.theme ?? 'static';
  const font = "system-ui, -apple-system, 'Segoe UI', sans-serif";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="${font}" class="at at-${tree.layout}">` +
    (theme === 'static' ? `<style>${STATIC_STYLE}</style><rect class="at-bg" width="${w}" height="${h}"/>` : '') +
    body.join('') +
    '</svg>'
  );
}

function gateBadge(x: number, y: number, gate: Gate) {
  return (
    `<g class="at-gate ${gate.toLowerCase()}"><rect x="${x}" y="${y}" width="42" height="18" rx="9"/>` +
    `<text x="${x + 21}" y="${y + 13.5}" text-anchor="middle">${gate}</text></g>`
  );
}

function nodeOpen(_tree: AttackTree, n: AttackNode, hl: Set<AttackNode>, opts: RenderOptions) {
  const cls = ['at-node', n.children.length ? 'inner' : 'leaf', hl.has(n) ? 'hl' : '', opts.selected === n.index ? 'selected' : '']
    .filter(Boolean)
    .join(' ');
  // The button's name is its own visible text (gate, label, value), so what
  // screen readers and voice control hear matches what is on screen.
  const a11y = opts.interactive ? ` tabindex="0" role="button" aria-pressed="${opts.selected === n.index}"` : '';
  return `<g class="${cls}" data-node="${n.index}"${a11y}>`;
}

/** One row per node, indented; long labels wrap. Fits a phone at 500 wide. */
function renderList(tree: AttackTree, opts: RenderOptions): string {
  const W = 500;
  const indent = 26;
  const hl = opts.highlight ?? highlighted(tree);
  const body: string[] = [];
  const all = nodes(tree);
  let y = 14;
  const rows = new Map<AttackNode, { x: number; y: number; h: number }>();
  for (const n of all) {
    const x = 14 + n.depth * indent;
    const value = shownValue(tree, n);
    const valueW = value ? textWidth(value, 15, true) + 16 : 0;
    const textX = x + 10 + (n.gate ? 50 : 0);
    const lines = wrap(n.label, W - 14 - textX - valueW - 10, 15, Boolean(n.children.length));
    const h = 30 + (lines.length - 1) * 19;
    rows.set(n, { x, y, h });
    y += h + 8;
  }
  // elbow connectors first, so boxes sit on top
  for (const n of all) {
    const r = rows.get(n)!;
    for (const c of n.children) {
      const rc = rows.get(c)!;
      body.push(`<path class="at-edge" d="M${r.x + 10} ${r.y + r.h} V${rc.y + 15} H${rc.x}"/>`);
    }
  }
  for (const n of all) {
    const { x, y: ry, h } = rows.get(n)!;
    const w = W - 14 - x;
    const value = shownValue(tree, n);
    const valueW = value ? textWidth(value, 15, true) + 16 : 0;
    const textX = x + 10 + (n.gate ? 50 : 0);
    const lines = wrap(n.label, w - (textX - x) - valueW - 10, 15, Boolean(n.children.length));
    body.push(nodeOpen(tree, n, hl, opts));
    body.push(`<rect class="at-box" x="${x}" y="${ry}" width="${w}" height="${h}" rx="6"/>`);
    if (n.gate) body.push(gateBadge(x + 10, ry + 6, n.gate));
    lines.forEach((l, k) => body.push(`<text class="at-label" x="${textX}" y="${ry + 21 + k * 19}">${esc(l)}</text>`));
    if (value) body.push(`<text class="at-value" x="${W - 24}" y="${ry + 21}" text-anchor="end">${esc(value)}</text>`);
    body.push('</g>');
  }
  y += 6;
  for (const note of tree.notes) {
    body.push(`<text class="at-note" x="${W / 2}" y="${y + 14}" text-anchor="middle">${esc(note)}</text>`);
    y += 21;
  }
  return frame(W, y + 8, body, tree, opts);
}

/** Classic top-down tree. Best for small trees with short labels. */
function renderTree(tree: AttackTree, opts: RenderOptions): string {
  const boxW = 136;
  const gap = 14;
  const hl = opts.highlight ?? highlighted(tree);
  const all = nodes(tree);
  // Every line of every label is kept: a box grows with its text, and each
  // level is as tall as its tallest box.
  const lines = new Map(all.map((n) => [n, wrap(n.label, boxW - 14, 13, Boolean(n.children.length))]));
  const boxH = (n: AttackNode) => 18 + lines.get(n)!.length * 16 + (shownValue(tree, n) ? 18 : 0);
  const maxDepth = Math.max(...all.map((n) => n.depth));
  const levelTop: number[] = [24];
  for (let d = 0; d < maxDepth; d++) {
    const tallest = Math.max(...all.filter((n) => n.depth === d).map(boxH));
    levelTop.push(levelTop[d]! + tallest + 72);
  }
  const xOf = new Map<AttackNode, number>();
  let next = 0;
  const place = (n: AttackNode): number => {
    let x: number;
    if (n.children.length) {
      const xs = n.children.map(place);
      x = (xs[0]! + xs[xs.length - 1]!) / 2;
    } else x = 20 + boxW / 2 + next++ * (boxW + gap);
    xOf.set(n, x);
    return x;
  };
  place(tree.root);
  const W = Math.max(500, 40 + next * (boxW + gap) - gap);
  const body: string[] = [];
  for (const n of all) {
    for (const c of n.children) {
      body.push(`<path class="at-edge" d="M${xOf.get(n)} ${levelTop[n.depth]! + boxH(n) + 22} L${xOf.get(c)} ${levelTop[c.depth]}"/>`);
    }
  }
  for (const n of all) {
    const x = xOf.get(n)!;
    const y = levelTop[n.depth]!;
    const h = boxH(n);
    const ls = lines.get(n)!;
    const value = shownValue(tree, n);
    body.push(nodeOpen(tree, n, hl, opts));
    body.push(`<rect class="at-box" x="${x - boxW / 2}" y="${y}" width="${boxW}" height="${h}" rx="8"/>`);
    ls.forEach((l, k) => body.push(`<text class="at-label" style="font-size:13px" x="${x}" y="${y + 20 + k * 16}" text-anchor="middle">${esc(l)}</text>`));
    if (value) body.push(`<text class="at-value" style="font-size:13px" x="${x}" y="${y + 20 + ls.length * 16 + 2}" text-anchor="middle">${esc(value)}</text>`);
    if (n.gate) body.push(gateBadge(x - 21, y + h + 2, n.gate));
    body.push('</g>');
  }
  let y = levelTop[maxDepth]! + Math.max(...all.filter((n) => n.depth === maxDepth).map(boxH)) + 16;
  for (const note of tree.notes) {
    body.push(`<text class="at-note" x="${W / 2}" y="${y + 14}" text-anchor="middle">${esc(note)}</text>`);
    y += 21;
  }
  return frame(W, y + 8, body, tree, opts);
}
