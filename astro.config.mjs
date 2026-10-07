// @ts-check
import { defineConfig } from 'astro/config';

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
});
