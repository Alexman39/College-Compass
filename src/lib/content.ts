/**
 * The one place pages get content from.
 *
 * Every getter first awaits validateContent(), which checks things a
 * per-file zod schema can't see because they span several files:
 *
 *   - every course / professor reference points at a file that exists
 *     (Astro's reference() only checks the *shape*, not existence)
 *   - no two courses share a code or a URL slug
 *   - no course has two lesson files for the same week
 *   - there is exactly one settings file
 *   - a practice quiz's answer key matches its questions
 *
 * Softer checks are printed as warnings without failing the build:
 *   - an assignment's `week` has no matching lesson file
 *
 * Invalid due dates are already rejected by the schema (content.config.ts).
 * All problems are collected and reported together, so one build run shows
 * everything that needs fixing. The check runs once per build (memoised).
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import type { ClassSlot, CourseRef, DeadlineItem } from './derive';
import type { ClassSeries, EventItem } from './ics';
import { checkAnswerKey, parseQuiz } from './quiz';
import { addDays } from './time';

export type Course = CollectionEntry<'courses'>;
export type Professor = CollectionEntry<'professors'>;
export type Lesson = CollectionEntry<'lessons'>;
export type Assignment = CollectionEntry<'assignments'>;
export type Resource = CollectionEntry<'resources'>;
export type Announcement = CollectionEntry<'announcements'>;
export type Settings = CollectionEntry<'settings'>;

let validated: Promise<void> | undefined;

export function validateContent(): Promise<void> {
  validated ??= runChecks();
  return validated;
}

/** Thrown when content is inconsistent; the message lists every problem. */
export class ContentError extends Error {
  constructor(problems: string[]) {
    super(
      `\n\nCollege Compass found ${problems.length} content problem(s):\n\n` +
        problems.map((p) => `  ✖ ${p}`).join('\n') +
        '\n\nFix the files above and run the build again.\n',
    );
    this.name = 'ContentError';
  }
}

async function runChecks(): Promise<void> {
  const [professors, courses, lessons, assignments, resources, announcements, settings] = await Promise.all([
    getCollection('professors'),
    getCollection('courses'),
    getCollection('lessons'),
    getCollection('assignments'),
    getCollection('resources'),
    getCollection('announcements'),
    getCollection('settings'),
  ]);

  const problems: string[] = [];
  const warnings: string[] = [];
  const where = (e: { filePath?: string; id: string }, collection: string) =>
    e.filePath ?? `src/content/${collection}/${e.id}`;

  const professorIds = new Set(professors.map((p) => p.id));
  const courseIds = new Set(courses.map((c) => c.id));
  const known = (ids: Set<string>) => [...ids].sort().join(', ') || '(none)';

  // ---- References ----------------------------------------------------------
  for (const c of courses) {
    if (!professorIds.has(c.data.professor.id)) {
      problems.push(
        `${where(c, 'courses')}: professor "${c.data.professor.id}" does not exist. ` +
          `Known professors: ${known(professorIds)}`,
      );
    }
  }

  const checkCourseRef = (
    entries: { id: string; filePath?: string; data: { course?: { id: string } } }[],
    collection: string,
  ) => {
    for (const e of entries) {
      const ref = e.data.course?.id;
      if (ref !== undefined && !courseIds.has(ref)) {
        problems.push(`${where(e, collection)}: course "${ref}" does not exist. Known courses: ${known(courseIds)}`);
      }
    }
  };
  checkCourseRef(lessons, 'lessons');
  checkCourseRef(assignments, 'assignments');
  checkCourseRef(resources, 'resources');
  checkCourseRef(announcements, 'announcements');

  // ---- Duplicates ----------------------------------------------------------
  const findDuplicates = <T>(items: T[], key: (item: T) => string, describe: (key: string, items: T[]) => string) => {
    const groups = new Map<string, T[]>();
    for (const item of items) {
      const k = key(item);
      groups.set(k, [...(groups.get(k) ?? []), item]);
    }
    for (const [k, group] of groups) if (group.length > 1) problems.push(describe(k, group));
  };

  const files = (group: { id: string; filePath?: string }[], collection: string) =>
    group.map((e) => where(e, collection)).join(' and ');

  findDuplicates(
    courses,
    (c) => c.data.code,
    (code, g) => `Course code ${code} is used twice: ${files(g, 'courses')}`,
  );
  findDuplicates(
    courses,
    (c) => c.data.slug,
    (s, g) => `Course URL /courses/${s}/ would be used twice: ${files(g, 'courses')}. Set a different "slug".`,
  );
  findDuplicates(
    lessons,
    (l) => `${l.data.course.id} week ${l.data.week}`,
    (k, g) => `Two lessons for ${k}: ${files(g, 'lessons')}`,
  );

  // ---- Quiz answer keys ----------------------------------------------------
  // The key must match the questions: same count, and every letter must be
  // one of that question's options.
  for (const a of assignments) {
    if (!a.data.answers) continue;
    try {
      for (const p of checkAnswerKey(parseQuiz(a.body ?? ''), a.data.answers)) {
        problems.push(`${where(a, 'assignments')}: answer key ${p}`);
      }
    } catch (error) {
      problems.push(`${where(a, 'assignments')}: quiz questions can't be read, ${(error as Error).message}`);
    }
  }

  // ---- Warnings (reported, but the build continues) ------------------------
  // An assignment's `week` should have a lesson page to link to. Archived
  // courses often have exercises without written-up lessons, so this is
  // only a heads-up.
  const lessonWeeks = new Set(lessons.map((l) => `${l.data.course.id}#${l.data.week}`));
  for (const a of assignments) {
    const week = a.data.week;
    if (week !== undefined && courseIds.has(a.data.course.id) && !lessonWeeks.has(`${a.data.course.id}#${week}`)) {
      warnings.push(
        `${where(a, 'assignments')}: week ${week} has no lesson file for course "${a.data.course.id}" ` +
          `(expected src/content/lessons/${a.data.course.id}/week-${String(week).padStart(2, '0')}.md)`,
      );
    }
  }
  if (warnings.length) {
    console.warn(
      `\nCollege Compass — ${warnings.length} content warning(s):\n` + warnings.map((w) => `  ⚠ ${w}`).join('\n') + '\n',
    );
  }

  // ---- Settings --------------------------------------------------------------
  if (settings.length !== 1) {
    problems.push(
      `Expected exactly one file in src/content/settings/, found ${settings.length}` +
        (settings.length ? `: ${files(settings, 'settings')}` : ''),
    );
  }

  if (problems.length) throw new ContentError(problems);
}

// ---------------------------------------------------------------------------
// Getters — always validated, always sorted the same way
// ---------------------------------------------------------------------------

const courseOrder = (a: Course, b: Course) =>
  a.data.year - b.data.year || a.data.semester - b.data.semester || a.data.code.localeCompare(b.data.code);

export async function getCourses(): Promise<Course[]> {
  await validateContent();
  return (await getCollection('courses')).sort(courseOrder);
}

export async function getProfessors(): Promise<Professor[]> {
  await validateContent();
  return getCollection('professors');
}

export async function getLessons(courseId?: string): Promise<Lesson[]> {
  await validateContent();
  const all = await getCollection('lessons', (l) => !courseId || l.data.course.id === courseId);
  return all.sort((a, b) => a.data.week - b.data.week);
}

export async function getAssignments(courseId?: string): Promise<Assignment[]> {
  await validateContent();
  const all = await getCollection('assignments', (a) => !courseId || a.data.course.id === courseId);
  // Deadlines first (soonest first), then undated practice by week and title.
  return all.sort(
    (a, b) =>
      (a.data.due?.getTime() ?? Infinity) - (b.data.due?.getTime() ?? Infinity) ||
      (a.data.week ?? 99) - (b.data.week ?? 99) ||
      a.data.title.localeCompare(b.data.title, 'el'),
  );
}

export async function getResources(courseId?: string): Promise<Resource[]> {
  await validateContent();
  return getCollection('resources', (r) => !courseId || r.data.course.id === courseId);
}

export async function getAnnouncements(): Promise<Announcement[]> {
  await validateContent();
  const all = await getCollection('announcements');
  return all.sort((a, b) => Number(b.data.pinned) - Number(a.data.pinned) || b.data.date.localeCompare(a.data.date));
}

export async function getProfessor(id: string): Promise<Professor> {
  // validateContent() guarantees every course's professor exists.
  return (await getProfessors()).find((p) => p.id === id)!;
}

export interface Week {
  week: number;
  lesson?: Lesson;
  assignments: Assignment[];
}

/**
 * A course's weeks: every week that has a lesson or an assignment, in
 * order. (Archived courses can have exercises without a written lesson.)
 */
export async function getWeeks(courseId: string): Promise<Week[]> {
  const [lessons, assignments] = await Promise.all([getLessons(courseId), getAssignments(courseId)]);
  const numbers = new Set([
    ...lessons.map((l) => l.data.week),
    ...assignments.flatMap((a) => (a.data.week === undefined ? [] : [a.data.week])),
  ]);
  return [...numbers]
    .sort((a, b) => a - b)
    .map((week) => ({
      week,
      lesson: lessons.find((l) => l.data.week === week),
      assignments: assignments.filter((a) => a.data.week === week),
    }));
}

// ---------------------------------------------------------------------------
// Plain shapes for the derived views (src/lib/derive.ts, src/lib/ics.ts)
// ---------------------------------------------------------------------------

export function courseRef(c: Course): CourseRef {
  return { id: c.id, code: c.data.code, title: c.data.title_en, slug: c.data.slug, accent: c.data.accent };
}

/** Every assignment that has a deadline, with its course attached. */
export async function getDeadlineItems(): Promise<DeadlineItem[]> {
  const [courses, assignments] = await Promise.all([getCourses(), getAssignments()]);
  const byId = new Map(courses.map((c) => [c.id, c]));
  return assignments.flatMap((a) =>
    a.data.due
      ? [
          {
            id: a.id,
            title: a.data.title,
            type: a.data.type,
            due: a.data.due,
            released: a.data.released,
            weight: a.data.weight,
            course: courseRef(byId.get(a.data.course.id)!),
          },
        ]
      : [],
  );
}

/** One-off events from announcements (meetings, talks), soonest first. */
export async function getEvents(): Promise<EventItem[]> {
  const announcements = await getAnnouncements();
  return announcements
    .flatMap((a) => (a.data.event ? [{ id: a.id, title: a.data.title, ...a.data.event }] : []))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Weekly class slots of the courses running this semester. */
export async function getClassSlots(): Promise<ClassSlot[]> {
  const current = (await getCourses()).filter((c) => c.data.status === 'current');
  return current.flatMap((c) => c.data.schedule.map((s) => ({ ...s, course: courseRef(c) })));
}

/**
 * Class series for the calendar feed: only for current courses whose
 * semester has dates in settings (without dates we can't say when classes
 * start and stop, so they're left out rather than guessed).
 */
export async function getClassSeries(): Promise<ClassSeries[]> {
  const [settings, current] = await Promise.all([
    getSettings(),
    getCourses().then((cs) => cs.filter((c) => c.data.status === 'current')),
  ]);
  const holidayDays = settings.holidays.flatMap((h) => {
    const days: string[] = [];
    for (let d = h.start; d <= (h.end ?? h.start); d = addDays(d, 1)) days.push(d);
    return days;
  });
  return current.flatMap((c) => {
    const sem = settings.semesters.find((s) => s.semester === c.data.semester);
    if (!sem) return [];
    return c.data.schedule.map((s) => ({
      slot: { ...s, course: courseRef(c) },
      from: sem.start,
      to: sem.end,
      except: holidayDays,
    }));
  });
}

export async function getSettings(): Promise<Settings['data']> {
  await validateContent();
  const [only] = await getCollection('settings');
  return only!.data;
}
