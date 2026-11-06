/**
 * Markdown plugin: give the checkboxes of task lists («- [ ] …») a label.
 *
 * GFM renders them as disabled checkboxes with no label, so a screen reader
 * announces just "checkbox, not checked". Each one now carries its list
 * item's text as its label.
 */

// The parts of the Sätteri plugin API this uses.
interface HastElement {
  type: 'element';
  tagName: string;
  properties?: { type?: string; checked?: boolean; disabled?: boolean };
}
interface VisitContext {
  replaceNode(node: HastElement, replacement: { type: 'raw'; value: string }): void;
  textContent(node: HastElement): string;
  parent(node: HastElement): HastElement | undefined;
}

const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function taskLists() {
  return {
    name: 'task-lists',
    element: {
      filter: ['input'],
      visit(node: HastElement, c: VisitContext) {
        if (node.properties?.type !== 'checkbox') return;
        const li = c.parent(node);
        if (li?.tagName !== 'li') return;
        const label = c.textContent(li).replace(/\s+/g, ' ').trim();
        c.replaceNode(node, {
          type: 'raw',
          value: `<input type="checkbox" disabled${node.properties.checked ? ' checked' : ''} aria-label="${attr(label)}">`,
        });
      },
    },
  };
}
