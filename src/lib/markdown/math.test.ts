import { describe, expect, it } from 'vitest';
import { markdownToHtml } from 'satteri';
import { mathFormulas } from './math';

// markdownToHtml is synchronous when every plugin is.
const toHtml = (md: string) => markdownToHtml(md, { hastPlugins: [mathFormulas] }).html;

describe('mathFormulas', () => {
  it('typesets an inline $…$ code span', () => {
    const html = toHtml('Το `$x^2$` εδώ.');
    expect(html).toContain('class="math-inline"');
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('<code>');
  });

  it('typesets a ```math block in display mode', () => {
    const html = toHtml('```math\nt_e = \\frac{a + 4m + b}{6}\n```\n');
    expect(html).toContain('class="math-display"');
    expect(html).toContain('katex-display');
    expect(html).not.toContain('<pre>');
  });

  it('includes MathML for screen readers', () => {
    expect(toHtml('`$a+b$`')).toContain('<math');
  });

  it('leaves prices, ordinary code and other code blocks alone', () => {
    const html = toHtml('Τιμή $12.40 και `x = 1`.\n\n```java\nint x = 1;\n```\n');
    expect(html).toContain('$12.40');
    expect(html).toContain('<code>x = 1</code>');
    expect(html).toContain('language-java');
    expect(html).not.toContain('katex');
  });

  it('fails loudly on a formula with a typo', () => {
    expect(() => toHtml('`$\\frac{1}{$`')).toThrow(/Math error/);
  });

  it('fails on words KaTeX cannot draw, such as Greek text in a formula', () => {
    expect(() => toHtml('`$\\text{φύλλα}$`')).toThrow(/Math error/);
  });
});
