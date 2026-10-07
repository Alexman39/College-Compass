/**
 * Every course accent must carry white text at WCAG AA (4.5:1), because
 * accents are used as-is behind white text on title bars and buttons.
 * Reads the course files directly, so courses added later (Year 3) are
 * checked automatically.
 */
import { describe, expect, it } from 'vitest';
import { AA_NORMAL, contrastRatio } from './color';

// Vite loads every course file's raw text at test time.
const files = import.meta.glob<string>('/src/content/courses/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const courses = Object.entries(files).map(([path, raw]) => {
  const frontMatter = raw.split(/^---$/m)[1] ?? '';
  const accent = /^accent:\s*["']?(#[0-9a-fA-F]{6})["']?\s*$/m.exec(frontMatter)?.[1];
  const code = /^code:\s*(\S+)/m.exec(frontMatter)?.[1] ?? path;
  return { file: path.replace('/src/content/', ''), code, accent, ratio: accent ? contrastRatio('#ffffff', accent) : 0 };
});

describe('course accents', () => {
  it('found the course files', () => {
    expect(courses.length).toBeGreaterThan(0);
  });

  it.each(courses.map((c) => ({ ...c, shown: c.ratio.toFixed(2) })))(
    '$code $accent — white text $shown:1',
    ({ file, accent, ratio }) => {
      expect(accent, `${file} has no valid accent`).toBeDefined();
      expect(ratio, `${file}: white on ${accent} is ${ratio.toFixed(2)}:1, needs ${AA_NORMAL}:1`).toBeGreaterThanOrEqual(
        AA_NORMAL,
      );
    },
  );
});
