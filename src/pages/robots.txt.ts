/**
 * /robots.txt — the first file search engines read: everything may be
 * crawled, and here is the sitemap. Built from `site`, so it follows the
 * domain if it ever changes.
 */
import type { APIRoute } from 'astro';
import { url } from '~/lib/url';

export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL(url('sitemap-index.xml'), site)}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
