/**
 * Markdown plugin: wrap every table in a box that scrolls sideways by
 * itself when the table is wider than the screen.
 *
 * Why: on a 360px phone a 4–5 column table doesn't fit. Squeezing it would
 * split Greek words mid-syllable; letting it widen the page would break the
 * layout. Scrolling inside its own box keeps every word whole and the page
 * steady. The box is focusable and labelled, so keyboard users can scroll
 * it too (arrow keys once it has focus).
 */

// The parts of the Sätteri plugin API this uses.
interface TableNode {
  tagName: string;
}
interface VisitContext {
  wrapNode(node: TableNode, parent: unknown): void;
}

// Written as a factory, like scoped-heading-ids.ts: Sätteri calls it once
// per document and uses the plugin it returns.
export function scrollableTables() {
  return {
    name: 'scrollable-tables',
    element: {
      filter: ['table'],
      visit(node: TableNode, c: VisitContext) {
        c.wrapNode(node, {
          type: 'element',
          tagName: 'div',
          properties: {
            className: ['table-scroll'],
            tabIndex: 0,
            role: 'region',
            ariaLabel: 'Πίνακας',
          },
          children: [],
        });
      },
    },
  };
}
