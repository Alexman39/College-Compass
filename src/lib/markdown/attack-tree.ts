/**
 * Markdown plugin: draw attack trees when the site is built.
 *
 *   ```attack-tree
 *   mode: cost
 *   unit: $
 *
 *   Άνοιξε το χρηματοκιβώτιο | OR
 *     Παραβίασε την κλειδαριά | 30.000 | ΕΕ
 *     …
 *   ```
 *
 * The format is described in src/lib/attack-tree.ts. The block becomes an
 * image (an SVG on a white card, like the other diagrams), so it enlarges on
 * tap and needs no JavaScript; its alt text describes every node. Values are
 * computed from the leaves, and a mistake (a wrong «= value», a missing
 * value, bad indentation) fails the build with the file name, instead of
 * showing a wrong tree on the site.
 */
import { AttackTreeError, describe, parse, render } from '../attack-tree';

interface HastElement {
  type: 'element';
  tagName: string;
  properties?: { className?: string[] | string };
  children?: { type: string; tagName?: string; properties?: HastElement['properties'] }[];
}
interface VisitContext {
  replaceNode(node: HastElement, replacement: { type: 'raw'; value: string }): void;
  textContent(node: HastElement): string;
  readonly fileURL: URL | undefined;
}

const classes = (el?: { properties?: HastElement['properties'] }) => {
  const c = el?.properties?.className;
  return Array.isArray(c) ? c : typeof c === 'string' ? c.split(' ') : [];
};
const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function attackTreeHtml(source: string, where?: URL): string {
  try {
    const tree = parse(source);
    const svg = render(tree);
    const [, w, h] = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(svg)!;
    const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    return `<p><img class="attack-tree" src="${src}" alt="${attr(describe(tree))}" width="${w}" height="${h}" loading="lazy" decoding="async"></p>`;
  } catch (error) {
    const message = error instanceof AttackTreeError ? error.message : String(error);
    throw new Error(`Attack tree error in ${where?.pathname ?? 'a Markdown file'}: ${message}`);
  }
}

export function attackTrees() {
  return {
    name: 'attack-trees',
    element: [
      {
        // ```attack-tree blocks arrive as <pre><code class="language-attack-tree">.
        filter: ['pre'],
        visit(node: HastElement, c: VisitContext) {
          const code = node.children?.find((child) => child.tagName === 'code');
          if (!code || !classes(code).includes('language-attack-tree')) return;
          c.replaceNode(node, { type: 'raw', value: attackTreeHtml(c.textContent(node), c.fileURL) });
        },
      },
    ],
  };
}
