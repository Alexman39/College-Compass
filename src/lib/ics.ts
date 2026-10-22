/**
 * The calendar feed (/calendar.ics) — iCalendar, RFC 5545, written by hand.
 *
 * Phones and calendar apps subscribe to this URL and re-read it, so students
 * see deadlines (with a reminder a day before), weekly classes and holidays
 * next to their own events.
 *
 * Format details that matter (and are unit-tested):
 *  - lines end in CRLF and are "folded" at 75 bytes — counted in UTF-8 bytes,
 *    and never splitting a Greek letter (2 bytes) in half
 *  - text escapes \ ; , and newlines
 *  - deadlines are exact instants, written in UTC ("Z")
 *  - classes repeat weekly in Europe/Athens local time, so 09:10 stays 09:10
 *    across the clock change; holidays are skipped with EXDATE
 */
import type { ClassSlot, DeadlineItem } from './derive';
import { addDays, athensMidnight, weekdayOf } from './time';

export interface ClassSeries {
  slot: ClassSlot;
  /** Semester range, "YYYY-MM-DD" (inclusive). */
  from: string;
  to: string;
  /** Holiday dates on which this class doesn't happen. */
  except: string[];
}

export interface Holiday {
  name: string;
  start: string;
  end?: string | undefined;
}

export interface CalendarInput {
  now: Date;
  /** Absolute site URL, e.g. https://alexman39.github.io/College-Compass/ */
  siteUrl: string;
  /** Absolute URL of a course page, given the course slug. */
  courseUrl: (slug: string) => string;
  deadlines: DeadlineItem[];
  classes: ClassSeries[];
  holidays: Holiday[];
}

const TYPE_LABEL: Record<DeadlineItem['type'], string> = {
  exercise: 'Άσκηση',
  coursework: 'Εργασία',
  exam: 'Εξέταση',
  quiz: 'Κουίζ',
};

// Europe/Athens rules: EET (+02) in winter, EEST (+03) from the last Sunday
// of March to the last Sunday of October.
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Athens',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0300',
  'TZNAME:EEST',
  'DTSTART:19810329T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0300',
  'TZOFFSETTO:+0200',
  'TZNAME:EET',
  'DTSTART:19961027T040000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

export function buildCalendar(input: CalendarInput): string {
  const stamp = utcStamp(input.now);
  const host = new URL(input.siteUrl).host;
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//College Compass//Calendar//EL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText('College Compass')}`,
    'X-WR-TIMEZONE:Europe/Athens',
    // Ask subscribers to re-read twice a day.
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    'X-PUBLISHED-TTL:PT12H',
    ...VTIMEZONE,
  ];

  for (const d of input.deadlines) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:deadline-${d.id.replaceAll('/', '-')}@${host}`,
      `DTSTAMP:${stamp}`,
      // No DTEND: a deadline is a moment (RFC 5545 §3.6.1).
      `DTSTART:${utcStamp(d.due)}`,
      `SUMMARY:${escapeText(`${TYPE_LABEL[d.type]}: ${d.title} (${d.course.code})`)}`,
      `DESCRIPTION:${escapeText(`Προθεσμία για το μάθημα ${d.course.title}.\nΑνεπίσημος οδηγός — ισχύει πάντα το Moodle.`)}`,
      `URL:${input.courseUrl(d.course.slug)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(`Αύριο: ${d.title}`)}`,
      'TRIGGER:-PT24H',
      'END:VALARM',
      'END:VEVENT',
    );
  }

  for (const c of input.classes) {
    const first = firstOnOrAfter(c.from, c.slot.day);
    if (first > c.to) continue; // the class day never falls inside the range
    const exdates = c.except.filter((d) => d >= c.from && d <= c.to && weekdayOf(d) === c.slot.day);
    lines.push(
      'BEGIN:VEVENT',
      `UID:class-${c.slot.course.id}-${c.slot.day}-${c.slot.start.replace(':', '')}-${c.from}@${host}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Europe/Athens:${localStamp(first, c.slot.start)}`,
      `DTEND;TZID=Europe/Athens:${localStamp(first, c.slot.end)}`,
      // UNTIL must be UTC when DTSTART has a TZID: the end of the last day.
      `RRULE:FREQ=WEEKLY;UNTIL=${utcStamp(new Date(athensMidnight(addDays(c.to, 1)).getTime() - 1000))}`,
      ...(exdates.length ? [`EXDATE;TZID=Europe/Athens:${exdates.map((d) => localStamp(d, c.slot.start)).join(',')}`] : []),
      `SUMMARY:${escapeText(c.slot.course.title)}`,
      ...(c.slot.room ? [`LOCATION:${escapeText(c.slot.room)}`] : []),
      `URL:${input.courseUrl(c.slot.course.slug)}`,
      'END:VEVENT',
    );
  }

  for (const h of input.holidays) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:holiday-${h.start}-${slugify(h.name)}@${host}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${h.start.replaceAll('-', '')}`,
      // All-day events end the day *after* the last day (exclusive).
      `DTEND;VALUE=DATE:${addDays(h.end ?? h.start, 1).replaceAll('-', '')}`,
      `SUMMARY:${escapeText(h.name)}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

/** Escape a TEXT value: backslash, semicolon, comma and newlines. */
export function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

const encoder = new TextEncoder();

/**
 * Fold a content line to at most 75 octets per physical line; continuation
 * lines start with a single space. Splits only between characters, so a
 * 2-byte Greek letter (or 4-byte emoji) is never cut in half.
 */
export function foldLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line;
  const out: string[] = [];
  let current = '';
  let bytes = 0;
  let limit = 75; // first line: 75; later lines: 74 + the leading space
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    if (bytes + size > limit) {
      out.push(current);
      current = '';
      bytes = 0;
      limit = 74;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join('\r\n ');
}

/** 2026-11-20T21:59:00Z → "20261120T215900Z". */
function utcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** ("2026-10-06", "09:10") → "20261006T091000" (local, used with TZID). */
function localStamp(dateKey: string, time: string): string {
  return `${dateKey.replaceAll('-', '')}T${time.replace(':', '')}00`;
}

function firstOnOrAfter(dateKey: string, day: ClassSlot['day']): string {
  let d = dateKey;
  while (weekdayOf(d) !== day) d = addDays(d, 1);
  return d;
}

function slugify(s: string): string {
  return encodeURIComponent(s.toLowerCase().replace(/\s+/g, '-')).replace(/%/g, '').slice(0, 40);
}
