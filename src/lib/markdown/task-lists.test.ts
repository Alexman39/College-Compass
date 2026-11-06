import { describe, expect, it } from 'vitest';
import { markdownToHtml } from 'satteri';
import { taskLists } from './task-lists';

describe('taskLists', () => {
  it('labels each checkbox with its item text', () => {
    const html = markdownToHtml('- [ ] Καταγραφή της υποδομής.\n- [x] Στόχος & σενάρια.\n', { hastPlugins: [taskLists] }).html;
    expect(html).toContain('aria-label="Καταγραφή της υποδομής."');
    expect(html).toMatch(/disabled checked aria-label="Στόχος &amp; σενάρια\."/);
  });
});
