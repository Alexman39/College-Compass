import { describe, expect, it } from 'vitest';
import { buildCalendar, escapeText, foldLine, type CalendarInput } from './ics';
import { parseAthensDateTime } from './time';

const at = (local: string) => {
  const r = parseAthensDateTime(local);
  if (!r.ok) throw new Error(r.reason);
  return r.date;
};
const course = { id: 'cn6000', code: 'CN6000_1', title: 'Final Year Project', slug: 'cn6000', accent: '#264a8e' };
const base: CalendarInput = {
  now: new Date('2026-10-22T09:00:00Z'),
  siteUrl: 'https://alexman39.github.io/College-Compass/',
  courseUrl: (slug) => `https://alexman39.github.io/College-Compass/courses/${slug}/`,
  deadlines: [],
  classes: [],
  holidays: [],
  events: [],
};
const utf8 = (s: string) => new TextEncoder().encode(s).length;

describe('text helpers', () => {
  it('escapes backslash, semicolon, comma and newlines', () => {
    expect(escapeText('a\\b; c, d\ne')).toBe('a\\\\b\\; c\\, d\\ne');
  });

  it('folds at 75 bytes without splitting Greek letters', () => {
    const line = `SUMMARY:${'Εργασία '.repeat(20)}`;
    const folded = foldLine(line).split('\r\n');
    expect(folded.length).toBeGreaterThan(1);
    for (const l of folded) expect(utf8(l)).toBeLessThanOrEqual(75);
    folded.slice(1).forEach((l) => expect(l.startsWith(' ')).toBe(true));
    // Unfolding gives back the exact original text (no broken characters).
    expect(folded.map((l, i) => (i ? l.slice(1) : l)).join('')).toBe(line);
  });
});

describe('buildCalendar', () => {
  it('produces a valid empty calendar with CRLF line endings', () => {
    const ics = buildCalendar(base);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/\n/); // no bare LF
    expect(ics).toContain('TZID:Europe/Athens');
  });

  it('writes deadlines as UTC instants with a reminder a day before', () => {
    const ics = buildCalendar({
      ...base,
      deadlines: [{ id: 'cn6000/report', title: 'Τελική αναφορά', type: 'coursework', due: at('2026-11-20T23:59'), course }],
    });
    expect(ics).toContain('UID:deadline-cn6000-report@alexman39.github.io');
    expect(ics).toContain('DTSTART:20261120T215900Z'); // 23:59 Athens (+02) in November
    expect(ics).toContain('SUMMARY:Εργασία: Τελική αναφορά (CN6000_1)');
    expect(ics).toContain('TRIGGER:-PT24H');
    expect(ics).toContain('URL:https://alexman39.github.io/College-Compass/courses/cn6000/');
  });

  it('repeats classes weekly in Athens time and skips holidays', () => {
    const ics = buildCalendar({
      ...base,
      classes: [
        {
          slot: { day: 'tue', start: '09:10', end: '13:00', room: 'Αίθουσα 2.1', course },
          from: '2026-10-05', // a Monday — first Tuesday is the 6th
          to: '2027-01-29',
          except: ['2026-10-28', '2026-12-29', '2027-01-05'], // Wed (ignored), two Tuesdays
        },
      ],
    });
    expect(ics).toContain('DTSTART;TZID=Europe/Athens:20261006T091000');
    expect(ics).toContain('DTEND;TZID=Europe/Athens:20261006T130000');
    // Last moment of 29 Jan 2027 in Athens (+02) is 21:59:59 UTC.
    expect(ics).toContain('RRULE:FREQ=WEEKLY;UNTIL=20270129T215959Z');
    expect(ics).toContain('EXDATE;TZID=Europe/Athens:20261229T091000,20270105T091000');
    expect(ics).toContain('LOCATION:Αίθουσα 2.1');
  });

  it('writes holidays as all-day events with an exclusive end date', () => {
    const ics = buildCalendar({ ...base, holidays: [{ name: 'Χριστούγεννα', start: '2026-12-23', end: '2027-01-06' }] });
    expect(ics).toContain('DTSTART;VALUE=DATE:20261223');
    expect(ics).toContain('DTEND;VALUE=DATE:20270107');
  });

  it('writes one-off events as UTC instants with a location and a reminder an hour before', () => {
    const ics = buildCalendar({
      ...base,
      events: [
        {
          id: '2026-10-24-meeting',
          title: 'Συνάντηση για τις πτυχιακές',
          start: at('2026-10-27T17:00'),
          end: at('2026-10-27T18:00'),
          location: 'Αίθουσα 44',
        },
      ],
    });
    expect(ics).toContain('UID:event-2026-10-24-meeting@alexman39.github.io');
    expect(ics).toContain('DTSTART:20261027T150000Z'); // 17:00 Athens (+02, after the clock change)
    expect(ics).toContain('DTEND:20261027T160000Z');
    expect(ics).toContain('LOCATION:Αίθουσα 44');
    expect(ics).toContain('TRIGGER:-PT1H');
  });
});
