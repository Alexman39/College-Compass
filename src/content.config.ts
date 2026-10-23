/**
 * Content model for College Compass.
 *
 * Each collection = one folder in src/content/. Astro reads the files, checks
 * them against the zod schema below, and fails the build with the file name
 * and field if anything is wrong. Pages then read typed data with
 * getCollection() — via src/lib/content.ts, which adds cross-file checks
 * (missing references, duplicate codes) that a per-file schema can't do.
 *
 * Conventions
 *  - File name (without extension) = entry id. References use that id:
 *      professor: papadopoulou-chrysoula   course: cn4003
 *  - Times are Athens wall-clock time "YYYY-MM-DDTHH:mm", written WITHOUT
 *    seconds. (With seconds, YAML silently turns them into UTC dates.)
 *  - Calendar dates are "YYYY-MM-DD".
 *  - Empty fields may be left blank or removed; both mean "not set yet".
 */
import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { parseAthensDateTime, isLocalDate } from '~/lib/time';

// ---------------------------------------------------------------------------
// Reusable field types
// ---------------------------------------------------------------------------

/**
 * Optional field that also treats "" and null as "not set". The CMS (phase B)
 * writes empty strings for cleared fields, and `email:` with nothing after it
 * is null in YAML; both should simply mean "missing".
 */
const blank = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === '' || v === null ? undefined : v), schema.optional());

/** Athens wall-clock datetime → exact instant (Date). */
const athensDateTime = z
  .unknown()
  .transform((value, ctx) => {
    if (value instanceof Date) {
      // YAML converted "2026-03-14T23:59:00" (with seconds) to a UTC Date.
      ctx.addIssue({
        code: 'custom',
        message: 'Write the time without seconds, e.g. 2026-03-14T23:59 (Athens time)',
      });
      return z.NEVER;
    }
    if (typeof value !== 'string') {
      ctx.addIssue({ code: 'custom', message: 'Expected a date-time like 2026-03-14T23:59' });
      return z.NEVER;
    }
    const result = parseAthensDateTime(value);
    if (!result.ok) {
      ctx.addIssue({ code: 'custom', message: result.reason });
      return z.NEVER;
    }
    return result.date;
  });

/**
 * "YYYY-MM-DD", kept as a string (a calendar day, not an instant).
 * YAML turns an unquoted 2026-10-07 into a Date at UTC midnight; for a
 * date-only value that's lossless, so we turn it back into the string.
 */
const localDate = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
  z
    .string({ error: 'Expected a date like 2026-10-07' })
    .refine(isLocalDate, { error: 'Not a real date — use YYYY-MM-DD, e.g. 2026-10-07' }),
);

const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'Use 24h time like 09:10' });

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: 'Use a 6-digit hex colour like #e0662f' });

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: 'Lowercase letters, digits and dashes only' });

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

/**
 * Icons available for course tiles. A fixed list so a typo fails the build
 * instead of showing a blank tile. Drawn as inline SVGs in phase A3.
 */
export const COURSE_ICONS = [
  'code', // programming
  'brackets', // advanced programming
  'sigma', // maths
  'briefcase', // professional life / projects
  'diagram', // modelling, UML
  'chip', // computer systems
  'network', // networks
  'signal', // data communications
  'globe', // web
  'mobile', // mobile apps
  'database', // databases
  'tree', // data structures & algorithms
  'book', // fallback
] as const;

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

const professors = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/professors' }),
  schema: z.object({
    /** Greek, "Επώνυμο Όνομα" */
    name: z.string().min(1),
    email: blank(z.email({ error: 'Not a valid email address' })),
    /** Free text, e.g. "Τρίτη 13:00–14:00, γραφείο 2.04" */
    office_hours: blank(z.string()),
  }),
});

const courses = defineCollection({
  // Markdown: front-matter = the fields below, body = the longer course
  // overview shown on the course page (optional).
  loader: glob({ pattern: '*.md', base: './src/content/courses' }),
  schema: z
    .object({
      // Written without Moodle's "_1" suffix: CN4003, not CN4003_1.
      code: z.string().regex(/^[A-Z]{2,4}\d{4}$/, { error: 'Course code like CN4003 (without the _1 suffix)' }),
      title_en: z.string().min(1),
      /** Greek title, if the course has one. Falls back to title_en. */
      title_el: blank(z.string()),
      /** URL segment. Defaults to the code, lowercased (cn4003). */
      slug: blank(slug),
      year: z.number().int().min(1).max(3),
      semester: z.number().int().min(1).max(2),
      professor: reference('professors'),
      schedule: z
        .array(
          z
            .object({
              day: z.enum(WEEKDAYS),
              start: clock,
              end: clock,
              room: blank(z.string()),
            })
            .refine((s) => s.end > s.start, { error: 'Class must end after it starts', path: ['end'] }),
        )
        .default([]),
      accent: hexColor,
      icon: z.enum(COURSE_ICONS).default('book'),
      /** One or two sentences for the course tile. */
      summary: blank(z.string()),
      learning_goals: z.array(z.string()).default([]),
      assessment: z
        .array(z.object({ item: z.string().min(1), weight: z.number().min(0).max(100) }))
        .default([])
        .refine((items) => items.length === 0 || items.reduce((sum, i) => sum + i.weight, 0) === 100, {
          error: 'Assessment weights must add up to 100',
        }),
      moodle_url: blank(z.url()),
      status: z.enum(['current', 'archived']),
    })
    .transform((c) => ({
      ...c,
      slug: c.slug ?? c.code.toLowerCase(),
      title_el: c.title_el ?? c.title_en,
    })),
});

const lessons = defineCollection({
  // One file per week: src/content/lessons/<course>/week-01.md
  loader: glob({ pattern: '**/*.md', base: './src/content/lessons' }),
  schema: z.object({
    course: reference('courses'),
    week: z.number().int().min(0).max(20),
    title: z.string().min(1),
    /** Day of the lecture, if known. */
    date: blank(localDate),
    tags: z.array(z.string()).default([]),
  }),
});

const assignments = defineCollection({
  // Markdown: front-matter = fields, body = the brief.
  loader: glob({ pattern: '**/*.md', base: './src/content/assignments' }),
  schema: z
    .object({
      course: reference('courses'),
      title: z.string().min(1),
      /** One line for cards and lists, e.g. "Δημιουργήστε μια ιστοσελίδα συνταγών." */
      teaser: blank(z.string()),
      type: z.enum(['exercise', 'coursework', 'exam', 'quiz']),
      /** Week it belongs to, so the lesson page can list it. */
      week: blank(z.number().int().min(0).max(20)),
      /** When it opens. Missing = available now. */
      released: blank(athensDateTime),
      /** Deadline. Missing = practice without a deadline (never "Upcoming"). */
      due: blank(athensDateTime),
      /** % of the course grade, if it counts. */
      weight: blank(z.number().min(0).max(100)),
      /** Where the official brief lives (Moodle). */
      link: blank(z.url()),
      /** How to hand it in, e.g. "Moodle — ένα .zip". */
      submission: blank(z.string()),
    })
    .refine((a) => !a.released || !a.due || a.due > a.released, {
      error: 'Due date must be after the release date',
      path: ['due'],
    }),
});

const resources = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/resources' }),
  schema: z.object({
    course: reference('courses'),
    title: z.string().min(1),
    kind: z.enum(['slides', 'video', 'tool', 'reading']),
    url: z.url(),
  }),
});

const announcements = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/announcements' }),
  schema: z.object({
    title: z.string().min(1),
    date: localDate,
    pinned: z.boolean().default(false),
    /** Leave empty for a site-wide announcement. */
    course: blank(reference('courses')),
  }),
});

const settings = defineCollection({
  // A single file: src/content/settings/site.yaml
  loader: glob({ pattern: '*.yaml', base: './src/content/settings' }),
  schema: z.object({
    academic_year: z.string().regex(/^\d{4}-\d{4}$/, { error: 'Like 2026-2027' }),
    semesters: z
      .array(z.object({ semester: z.number().int().min(1).max(2), start: localDate, end: localDate }))
      .default([]),
    holidays: z.array(z.object({ name: z.string(), start: localDate, end: blank(localDate) })).default([]),
  }),
});

export const collections = { professors, courses, lessons, assignments, resources, announcements, settings };
