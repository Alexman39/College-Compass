/// <reference types="vitest/config" />
// getViteConfig reuses Astro's Vite setup, so imports like '~/lib/time'
// resolve in tests exactly as they do in the site.
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
