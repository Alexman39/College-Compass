import { describe, expect, it } from 'vitest';
import { formatClosed, formatFrontier, node, trace } from './water-jug';

describe('water-jug search', () => {
  it('reproduces the DFS table of Lecture 2 (slide 21) row by row', () => {
    const table = trace('DFS').map((r) => [
      formatFrontier(r.frontier),
      formatClosed(r.closed),
      node(r.id).label,
      r.goal ? 'ΤΕΛΙΚΗ' : r.loop ? '- (βρόχος)' : formatFrontier(r.children),
    ]);
    expect(table).toEqual([
      ['<Α>', '{}', 'Α', '<Β, Γ>'],
      ['<Β, Γ>', '{Α}', 'Β', '<Α, Δ>'],
      ['<Α, Δ, Γ>', '{Α, Β}', 'Α', '- (βρόχος)'],
      ['<Δ, Γ>', '{Α, Β}', 'Δ', '<Β, Ζ, Γ>'],
      ['<Β, Ζ, Γ, Γ>', '{Α, Β, Δ}', 'Β', '- (βρόχος)'],
      ['<Ζ, Γ, Γ>', '{Α, Β, Δ}', 'Ζ', '<Α, Θ, Δ>'],
      ['<Α, Θ, Δ, Γ, Γ>', '{Α, Β, Δ, Ζ}', 'Α', '- (βρόχος)'],
      ['<Θ, Δ, Γ, Γ>', '{Α, Β, Δ, Ζ}', 'Θ', '<Ζ, Δ, Ι>'],
      ['<Ζ, Δ, Ι, Δ, Γ, Γ>', '{Α, Β, Δ, Ζ, Θ}', 'Ζ', '- (βρόχος)'],
      ['<Δ, Ι, Δ, Γ, Γ>', '{Α, Β, Δ, Ζ, Θ}', 'Δ', '- (βρόχος)'],
      ['<Ι, Δ, Γ, Γ>', '{Α, Β, Δ, Ζ, Θ}', 'Ι', '<Κ, Γ, Β>'],
      ['<Κ, Γ, Β, Δ, Γ, Γ>', '{Α, Β, Δ, Ζ, Θ, Ι}', 'Κ', 'ΤΕΛΙΚΗ'],
    ]);
  });

  it('BFS examines the tree level by level and also reaches Κ (40, 50)', () => {
    const rows = trace('BFS');
    expect(rows.map((r) => node(r.id).label).join('')).toBe('ΑΒΓΑΔΕΑΒΖΓΑΗΑΘΔΕΓΖΔΙΚ');
    expect(rows.at(-1)).toMatchObject({ goal: true });
    expect(node('k')).toMatchObject({ big: 40, small: 50 });
  });

  it('BFS passes through every state of the slide', () => {
    for (const label of 'ΑΒΓΔΕΖΗΘΙΚ') {
      expect(trace('BFS').some((r) => node(r.id).label === label)).toBe(true);
    }
  });
});
