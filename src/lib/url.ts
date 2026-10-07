/**
 * Build a site-internal URL that respects Astro's `base` setting.
 *
 * The site currently lives at /College-Compass/ on GitHub Pages, so a plain
 * href="/upcoming/" would point outside it. Always write links as
 * url('upcoming') or url('/courses/cn4003/') and this adds the base prefix.
 *
 * Paths get a trailing slash (matching `trailingSlash: 'always'`) unless they
 * look like a file (contain a dot in the last segment, e.g. "calendar.ics")
 * or carry a #hash / ?query.
 */
const BASE = import.meta.env.BASE_URL; // e.g. "/College-Compass/" — always ends in "/"

export function url(path = ''): string {
  const clean = path.replace(/^\/+/, '');
  if (clean === '') return BASE;

  const [pathname, suffix = ''] = splitSuffix(clean);
  const lastSegment = pathname.split('/').pop() ?? '';
  const isFile = lastSegment.includes('.');
  const withSlash = isFile || pathname.endsWith('/') || pathname === '' ? pathname : `${pathname}/`;

  return `${BASE}${withSlash}${suffix}`;
}

/** Split "a/b?x=1#y" into ["a/b", "?x=1#y"]. */
function splitSuffix(path: string): [string, string] {
  const i = path.search(/[?#]/);
  return i === -1 ? [path, ''] : [path.slice(0, i), path.slice(i)];
}

/**
 * True when `href` (as produced by url()) is the page currently shown.
 * Used to set aria-current="page" in navigation.
 */
export function isCurrent(href: string, currentPath: string): boolean {
  const norm = (p: string) => (p.endsWith('/') ? p : `${p}/`);
  return norm(href) === norm(currentPath);
}
