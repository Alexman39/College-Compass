/**
 * Markdown plugin: give headings in assignment briefs ids that are unique
 * per assignment.
 *
 * Why: a course page shows several briefs at once. Two briefs that both
 * have "## Ερώτημα 1" would otherwise both get id="ερώτημα-1" — duplicate
 * ids on one page. Here they become e.g.
 * "cn4000-java-revision-set-1--ερώτημα-1".
 *
 * Runs before Astro's own heading-id step, which keeps ids that are already
 * set. Other content (lessons, course overviews) is left alone.
 */
// Just the parts of the Sätteri plugin API this uses (a hast plugin is a
// plain object: a name plus a visitor per node type).
interface HeadingNode {
  tagName: string;
}
interface VisitContext {
  textContent(node: HeadingNode): string;
  setProperty(node: HeadingNode, key: string, value: unknown): void;
}
interface FactoryContext {
  readonly fileURL: URL | undefined;
}

/** Lowercase, keep letters (incl. Greek) and digits, spaces → dashes. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

export function scopedHeadingIds(ctx: FactoryContext) {
  if (!ctx.fileURL) return null;
  const path = decodeURIComponent(ctx.fileURL.pathname);
  const match = /\/content\/assignments\/(.+)\.md$/.exec(path);
  if (!match) return null; // not an assignment brief: leave untouched

  const prefix = match[1]!.replaceAll('/', '-');
  const seen = new Map<string, number>();

  return {
    name: 'scoped-heading-ids',
    // Element visitors declare which tags they want; only headings here.
    element: {
      filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      visit(node: HeadingNode, c: VisitContext) {
        const base = `${prefix}--${slugify(c.textContent(node))}`;
        const n = seen.get(base) ?? 0;
        seen.set(base, n + 1);
        c.setProperty(node, 'id', n === 0 ? base : `${base}-${n}`);
      },
    },
  };
}
