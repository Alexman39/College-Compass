/**
 * /calendar.ics — subscribe from a phone or calendar app. Generated at build
 * time (the site rebuilds daily), so it always reflects the current content.
 */
import type { APIRoute } from 'astro';
import { getClassSeries, getDeadlineItems, getSettings, validateContent } from '~/lib/content';
import { buildCalendar } from '~/lib/ics';
import { courseUrl } from '~/lib/url';

export const GET: APIRoute = async ({ site }) => {
  await validateContent();
  const [deadlines, classes, settings] = await Promise.all([getDeadlineItems(), getClassSeries(), getSettings()]);
  const absolute = (path: string) => new URL(path, site).href;

  const body = buildCalendar({
    now: new Date(),
    siteUrl: absolute(import.meta.env.BASE_URL),
    courseUrl: (slug) => absolute(courseUrl(slug)),
    deadlines,
    classes,
    holidays: settings.holidays,
  });

  return new Response(body, { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } });
};
