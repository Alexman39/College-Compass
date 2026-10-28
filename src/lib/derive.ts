/**
 * Views derived from content — computed, never stored.
 *
 *   upcomingDeadlines   what's due in the next N days
 *   weekTimetable       this week's classes, Monday → Sunday
 *   workloadForecast    deadlines per week for the next few weeks
 *   archiveGroups       courses grouped Year → Semester
 *
 * Everything takes plain data and an explicit `now`, so it can be tested
 * without Astro and re-run in the browser where freshness matters.
 */
import { addDays, athensDateKey, athensMidnight, mondayOf, weekdayOf, type WeekdayKey } from './time';

export interface DeadlineItem {
  id: string;
  title: string;
  type: 'exercise' | 'coursework' | 'exam' | 'quiz';
  due: Date;
  released?: Date | undefined;
  weight?: number | undefined;
  course: CourseRef;
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
