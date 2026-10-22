import { describe, expect, it, vi } from 'vitest';
import { archiveGroups, upcomingDeadlines, weekTimetable, workloadForecast, type ClassSlot, type DeadlineItem } from './derive';
import { addDays, athensDateKey, mondayOf, parseAthensDateTime, weekdayOf } from './time';

vi.stubEnv('TZ', 'America/New_York'); // results must not depend on the machine's zone

const at = (local: string) => {
  const r = parseAthensDateTime(local);
  if (!r.ok) throw new Error(r.reason);
  return r.date;
};
const course = { id: 'cn6000', code: 'CN6000_1', title: 'Test', slug: 'cn6000', accent: '#264a8e' };
const item = (id: string, due: string, weight?: number): DeadlineItem => ({
  id,
  title: id,
  type: 'coursework',
  due: at(due),
  weight,
  course,
});

describe('Athens calendar days', () => {
  it('uses the Athens date, not the UTC date', () => {
    // 23:30 Athens on the 21st is 20:30 UTC — still the 21st in both…
    expect(athensDateKey(at('2026-10-21T23:30'))).toBe('2026-10-21');
    // …but 00:30 Athens on the 22nd is 21:30 UTC on the 21st.
    expect(athensDateKey(at('2026-10-22T00:30'))).toBe('2026-10-22');
  });

  it('adds days across month and year ends', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('finds weekdays and Mondays', () => {
    expect(weekdayOf('2026-10-22')).toBe('thu');
    expect(mondayOf('2026-10-22')).toBe('2026-10-19');
    expect(mondayOf('2026-10-25')).toBe('2026-10-19'); // Sunday belongs to the week before
    expect(mondayOf('2026-10-26')).toBe('2026-10-26');
  });
});

describe('upcomingDeadlines', () => {
  const now = at('2026-10-22T12:00');
  const items = [
    item('past', '2026-10-22T11:59'),
    item('later', '2026-11-04T09:00'),
    item('soon', '2026-10-23T23:59'),
    item('last-day', '2026-11-05T23:59'), // 14th day after today, last minute
    item('beyond', '2026-11-06T00:00'),
  ];

  it('keeps everything from now to the end of the 14th Athens day, soonest first', () => {
    // The window crosses the 25 October clock change; it must still end at
    // Athens midnight, not an hour early.
    expect(upcomingDeadlines(items, now).map((i) => i.id)).toEqual(['soon', 'later', 'last-day']);
  });

  it('is empty when nothing is due', () => {
    expect(upcomingDeadlines([], now)).toEqual([]);
  });
});

describe('weekTimetable', () => {
  const slots: ClassSlot[] = [
    { day: 'thu', start: '13:00', end: '15:00', course },
    { day: 'thu', start: '08:30', end: '12:00', course },
    { day: 'mon', start: '09:10', end: '13:00', course },
  ];

  it('returns Monday–Sunday of the current Athens week, today marked', () => {
    const week = weekTimetable(slots, at('2026-10-22T10:00'));
    expect(week.map((d) => d.date)).toEqual([
      '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25',
    ]);
    expect(week.filter((d) => d.isToday).map((d) => d.day)).toEqual(['thu']);
  });

  it('sorts each day by start time', () => {
    const thu = weekTimetable(slots, at('2026-10-22T10:00')).find((d) => d.day === 'thu')!;
    expect(thu.slots.map((s) => s.start)).toEqual(['08:30', '13:00']);
  });
});

describe('workloadForecast', () => {
  const now = at('2026-10-22T12:00'); // Thursday; clocks go back Sunday 25th
  const items = [
    item('this-week-past', '2026-10-20T23:59', 10),
    item('sunday-late', '2026-10-25T23:59', 20), // last minute of the DST week
    item('monday-midnight', '2026-10-26T00:00', 30), // first minute of next week
    item('in-week-6', '2026-11-29T23:59'),
    item('week-7', '2026-11-30T00:00'),
  ];

  it('buckets by Athens week, Monday 00:00 to Sunday 23:59, across the clock change', () => {
    const f = workloadForecast(items, now);
    expect(f.map((w) => w.weekStart)).toEqual([
      '2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23',
    ]);
    expect(f.map((w) => w.count)).toEqual([2, 1, 0, 0, 0, 1]);
    expect(f[0]!.weight).toBe(30);
    expect(f[1]!.items.map((i) => i.id)).toEqual(['monday-midnight']);
  });
});

describe('archiveGroups', () => {
  it('groups Year → Semester in order', () => {
    const groups = archiveGroups([
      { id: 'b', year: 2, semester: 1 },
      { id: 'a', year: 1, semester: 2 },
      { id: 'c', year: 1, semester: 1 },
    ]);
    expect(groups.map((g) => [g.year, g.semesters.map((s) => [s.semester, s.courses.map((c) => c.id)])])).toEqual([
      [1, [[1, ['c']], [2, ['a']]]],
      [2, [[1, ['b']]]],
    ]);
  });
});
