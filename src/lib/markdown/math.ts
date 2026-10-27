/**
 * Markdown plugin: typeset math with KaTeX when the site is built.
 *
 * Two ways to write math in a lesson:
 *
 *   Inline, inside a code span with dollar signs:  `$x^2 + y^2$`
 *   On its own line, as a fenced block:
 *
 *     ```math
 *     t_e = \frac{a + 4m + b}{6}
 *     ```
 *
 * Why not plain $…$? Some task sheets contain prices like "$12.40", which
 * would turn into formulas. Code spans and ```math blocks are never ambiguous.
 *
 * KaTeX runs here, at build time: the browser receives finished HTML (plus
 * hidden MathML that screen readers read), so no JavaScript is needed. The
 * stylesheet and fonts are bundled with the site (see the lesson page), so no
 * request goes to a third-party server. A formula with a typo fails the build
 * with the file name, instead of showing broken text on the live site.
 */
import katex from 'katex';

// The parts of the Sätteri plugin API this uses.
interface HastElement {
  type: 'element';
  tagName: string;
  properties?: { className?: string[] | string };
  children?: { type: string; tagName?: string; properties?: HastElement['properties'] }[];
}
interface VisitContext {
  replaceNode(node: HastElement, replacement: { type: 'raw'; value: string }): void;
  textContent(node: HastElement): string;
  parent(node: HastElement): HastElement | undefined;
  readonly fileURL: URL | undefined;
}

const classes = (el?: { properties?: HastElement['properties'] }) => {
  const c = el?.properties?.className;
  return Array.isArray(c) ? c : typeof c === 'string' ? c.split(' ') : [];
};

function render(tex: string, displayMode: boolean, where: URL | undefined): string {
  try {
    // strict: anything KaTeX would only warn about (e.g. Greek words inside a
    // formula, which its fonts can't draw) fails the build instead. Keep
    // words in the sentence and symbols in the formula.
    const html = katex.renderToString(tex, { displayMode, throwOnError: true, strict: 'error', output: 'htmlAndMathml' });
    // data-pagefind-ignore: the HTML and MathML copies would put every symbol
    // into the search index twice.
    return displayMode
      ? `<div class="math-display" data-pagefind-ignore>${html}</div>`
      : `<span class="math-inline" data-pagefind-ignore>${html}</span>`;
  } catch (error) {
    throw new Error(`Math error in ${where?.pathname ?? 'a Markdown file'}: ${(error as Error).message}\n  in: ${tex}`);
  }
}

// A factory, like the other plugins: Sätteri calls it once per document.
export function mathFormulas() {
  return {
    name: 'math-formulas',
    element: [
      {
        // ```math blocks arrive as <pre><code class="language-math">.
        filter: ['pre'],
        visit(node: HastElement, c: VisitContext) {
          const code = node.children?.find((child) => child.tagName === 'code');
          if (!code || !classes(code).includes('language-math')) return;
          c.replaceNode(node, { type: 'raw', value: render(c.textContent(node).trim(), true, c.fileURL) });
        },
      },
      {
        // Inline: a code span whose whole text is $…$ (and not inside a <pre>).
        filter: ['code'],
        visit(node: HastElement, c: VisitContext) {
          if (c.parent(node)?.tagName === 'pre') return;
          const text = c.textContent(node);
          const match = /^\$(.+)\$$/s.exec(text);
          if (!match) return;
          c.replaceNode(node, { type: 'raw', value: render(match[1], false, c.fileURL) });
        },
      },
    ],
  };
}
