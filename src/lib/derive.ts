/**
 * Views derived from content — computed, never stored.
 *
 *   upcomingDeadlines   what's due in the next N days
 *   weekTimetable       this week's classes, Monday → Sunday
 *   workloadForecast    deadlines per week for the next few weeks
 *   calendarWeeks       every week of the academic year, day by day
 *   archiveGroups       courses grouped Year → Semester
 *
 * Everything takes plain data and an explicit `now`, so it can be tested
 * without Astro and re-run in the browser where freshness matters.
 */
import type { ClassSeries, EventItem, Holiday } from './ics';
import { addDays, athensDateKey, athensMidnight, mondayOf, weekdayOf, type WeekdayKey } from './time';

export interface DeadlineItem {
  id: string;
  title: string;
  type: 'exercise' | 'coursework' | 'exam' | 'quiz';
  due: Date;
  released?: Date | undefined;
  weight?: number | undefined;
  course: CourseRef;
  /** Has a brief, so it has its own page (/courses/<slug>/assignments/<file>/). */
  hasPage?: boolean;
}

export interface CourseRef {
  id: string;
  code: string;
  title: string;
  slug: string;
  accent: string;
  /** An optional class (see `optional` in the course schema). */
  optional?: boolean;
}

export interface ClassSlot {
  day: WeekdayKey;
  start: string; // "09:10"
  end: string;
  room?: string | undefined;
  course: CourseRef;
}

/**
 * Deadlines from now until the end of the Athens day `days` days ahead,
 * soonest first. Counted in calendar days, not 24-hour blocks: a window
 * that crosses a clock change would otherwise end an hour early or late.
 */
export function upcomingDeadlines(items: DeadlineItem[], now: Date, days = 14): DeadlineItem[] {
  const until = upcomingUntil(now, days);
  return items
    .filter((i) => i.due.getTime() >= now.getTime() && i.due.getTime() < until.getTime())
    .sort((a, b) => a.due.getTime() - b.due.getTime());
}

/** End (exclusive) of the upcoming window: Athens midnight after day `days`. */
export function upcomingUntil(now: Date, days = 14): Date {
  return athensMidnight(addDays(athensDateKey(now), days + 1));
}

export interface TimetableDay {
  date: string; // "2026-10-19"
  day: WeekdayKey;
  isToday: boolean;
  slots: ClassSlot[];
}

/** The Athens week (Mon–Sun) containing `now`, with each day's classes in time order. */
export function weekTimetable(slots: ClassSlot[], now: Date): TimetableDay[] {
  const today = athensDateKey(now);
  const monday = mondayOf(today);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const day = weekdayOf(date);
    return {
      date,
      day,
      isToday: date === today,
      slots: slots.filter((s) => s.day === day).sort((a, b) => a.start.localeCompare(b.start)),
    };
  });
}

export interface ForecastWeek {
  /** Monday of the week, "YYYY-MM-DD". */
  weekStart: string;
  count: number;
  /** Sum of assignment weights (% of a course grade) due that week. */
  weight: number;
  items: DeadlineItem[];
}

/**
 * Deadlines per Athens week, starting with the current week. Deadlines
 * already past this week still count — it's "how heavy is this week".
 */
export function workloadForecast(items: DeadlineItem[], now: Date, weeks = 6): ForecastWeek[] {
  const firstMonday = mondayOf(athensDateKey(now));
  return Array.from({ length: weeks }, (_, i) => {
    const weekStart = addDays(firstMonday, i * 7);
    const from = athensMidnight(weekStart).getTime();
    const to = athensMidnight(addDays(weekStart, 7)).getTime();
    const inWeek = items
      .filter((d) => d.due.getTime() >= from && d.due.getTime() < to)
      .sort((a, b) => a.due.getTime() - b.due.getTime());
    return {
      weekStart,
      count: inWeek.length,
      weight: inWeek.reduce((sum, d) => sum + (d.weight ?? 0), 0),
      items: inWeek,
    };
  });
}

export interface ArchiveYear<T> {
  year: number;
  semesters: { semester: number; courses: T[] }[];
}

/** Courses grouped Year → Semester, both ascending. */
export function archiveGroups<T extends { year: number; semester: number }>(courses: T[]): ArchiveYear<T>[] {
  const years = [...new Set(courses.map((c) => c.year))].sort((a, b) => a - b);
  return years.map((year) => {
    const inYear = courses.filter((c) => c.year === year);
    const semesters = [...new Set(inYear.map((c) => c.semester))].sort((a, b) => a - b);
    return { year, semesters: semesters.map((semester) => ({ semester, courses: inYear.filter((c) => c.semester === semester) })) };
  });
}

export interface CalendarDay {
  date: string; // "2026-11-06"
  day: WeekdayKey;
  isToday: boolean;
  isPast: boolean;
  /** Name of the holiday on this day, if any (no classes then). */
  holiday?: string | undefined;
  classes: ClassSlot[];
  deadlines: DeadlineItem[];
  events: EventItem[];
}

export interface CalendarWeek {
  /** Monday, "YYYY-MM-DD". */
  start: string;
  isCurrent: boolean;
  /** Teaching week within a semester, if the week falls in one. */
  semester?: { semester: number; week: number } | undefined;
  days: CalendarDay[];
}

export interface CalendarWeeksInput {
  now: Date;
  series: ClassSeries[];
  deadlines: DeadlineItem[];
  events: EventItem[];
  holidays: Holiday[];
  semesters: { semester: number; start: string; end: string }[];
}

/**
 * Every Monday–Sunday week from the first semester's start to the end of
 * the last semester (or the last deadline/event, if later). A class appears
 * on a date only inside its semester and not on a holiday, exactly as in
 * the calendar feed.
 */
export function calendarWeeks({ now, series, deadlines, events, holidays, semesters }: CalendarWeeksInput): CalendarWeek[] {
  const today = athensDateKey(now);
  const thisMonday = mondayOf(today);
  const starts = semesters.map((s) => s.start);
  const ends = [
    ...semesters.map((s) => s.end),
    ...deadlines.map((d) => athensDateKey(d.due)),
    ...events.map((e) => athensDateKey(e.start)),
  ];
  const first = mondayOf([...starts, today].sort()[0]!);
  const last = mondayOf([...ends, today].sort().at(-1)!);

  const holidayOn = new Map<string, string>();
  for (const h of holidays) {
    for (let d = h.start; d <= (h.end ?? h.start); d = addDays(d, 1)) holidayOn.set(d, h.name);
  }

  const weeks: CalendarWeek[] = [];
  for (let monday = first; monday <= last; monday = addDays(monday, 7)) {
    const sem = semesters.find((s) => s.start <= addDays(monday, 6) && s.end >= monday);
    const days = Array.from({ length: 7 }, (_, i): CalendarDay => {
      const date = addDays(monday, i);
      const day = weekdayOf(date);
      const holiday = holidayOn.get(date);
      return {
        date,
        day,
        isToday: date === today,
        isPast: date < today,
        holiday,
        classes: series
          .filter((c) => c.slot.day === day && c.from <= date && date <= c.to && !c.except.includes(date))
          .map((c) => c.slot)
          .sort((a, b) => a.start.localeCompare(b.start)),
        deadlines: deadlines.filter((d) => athensDateKey(d.due) === date).sort((a, b) => a.due.getTime() - b.due.getTime()),
        events: events.filter((e) => athensDateKey(e.start) === date),
      };
    });
    weeks.push({
      start: monday,
      isCurrent: monday === thisMonday,
      semester: sem && { semester: sem.semester, week: Math.round((Date.parse(monday) - Date.parse(mondayOf(sem.start))) / 6048e5) + 1 },
      days,
    });
  }
  return weeks;
}
