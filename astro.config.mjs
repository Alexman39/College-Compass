// @ts-check
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import { scopedHeadingIds } from './src/lib/markdown/scoped-heading-ids.ts';
import { scrollableTables } from './src/lib/markdown/scrollable-tables.ts';
import { mathFormulas } from './src/lib/markdown/math.ts';

// Where the site is served from. To move to a custom domain later, change
// `site` to e.g. 'https://compass.example.gr' and `base` to '/'. Every
// internal link goes through src/lib/url.ts, so nothing else has to change.
export default defineConfig({
  site: 'https://alexman39.github.io',
  base: '/College-Compass/',
  // Every page is built as /path/index.html, so URLs always end in "/".
  // Keeping both settings in agreement avoids dev/prod differences.
  trailingSlash: 'always',
  build: { format: 'directory' },
  output: 'static',
  markdown: {
    // Astro's default Markdown processor, plus three small plugins: unique
    // heading ids inside assignment briefs (several briefs share a course
    // page), tables that scroll sideways on narrow screens, and math typeset
    // with KaTeX at build time (`$…$` code spans and ```math blocks).
    processor: satteri({ hastPlugins: [mathFormulas, scopedHeadingIds, scrollableTables] }),
    // Code blocks get both a light and a dark colour set as CSS variables
    // (--shiki-light / --shiki-dark); base.css picks one per theme.
    shikiConfig: {
      themes: { light: 'github-light-high-contrast', dark: 'github-dark-high-contrast' },
      defaultColor: false,
    },
  },
});
