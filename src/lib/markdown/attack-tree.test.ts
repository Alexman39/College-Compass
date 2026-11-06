import { describe, expect, it } from 'vitest';
import { markdownToHtml } from 'satteri';
import { attackTrees } from './attack-tree';

const toHtml = (md: string) => markdownToHtml(md, { hastPlugins: [attackTrees] }).html;

describe('attackTrees', () => {
  it('turns an ```attack-tree block into an image with a description', () => {
    const html = toHtml('```attack-tree\nmode: cost\nunit: $\n\nΣτόχος | OR\n  Α | 3\n  Β | 5\n```\n');
    expect(html).toContain('<img class="attack-tree" src="data:image/svg+xml;base64,');
    expect(html).toContain('alt="Δέντρο επιθέσεων. Στόχος (OR), 3 $: Α, 3 $· Β, 5 $.');
    expect(html).not.toContain('<pre>');
  });

  it('leaves other code blocks alone', () => {
    expect(toHtml('```text\nA | OR\n```\n')).toContain('language-text');
  });

  it('fails the build on a wrong value, naming the problem', () => {
    expect(() => toHtml('```attack-tree\nmode: cost\n\nΣτόχος | OR = 4\n  Α | 3\n  Β | 5\n```\n')).toThrow(
      /Attack tree error .*«Στόχος» is written as 4 but its children give 3/,
    );
  });
});
