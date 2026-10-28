// @ts-check
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import sitemap from '@astrojs/sitemap';
import { scopedHeadingIds } from './src/lib/markdown/scoped-heading-ids.ts';
import { scrollableTables } from './src/lib/markdown/scrollable-tables.ts';
import { mathFormulas } from './src/lib/markdown/math.ts';

// Where the site is served from: its own domain, collegecompass.gr, on
// GitHub Pages (custom domain set in Settings → Pages). Every internal link
// goes through src/lib/url.ts, so moving it again is a change here only.
export default defineConfig({
  site: 'https://collegecompass.gr',
  base: '/',
  // Every page is built as /path/index.html, so URLs always end in "/".
  // Keeping both settings in agreement avoids dev/prod differences.
  trailingSlash: 'always',
  build: { format: 'directory' },
  output: 'static',
  // sitemap-index.xml for search engines (linked from robots.txt). Pages
  // marked noindex are left out; keep this list in step with them.
  integrations: [sitemap({ filter: (page) => !page.endsWith('/styleguide/') })],
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
