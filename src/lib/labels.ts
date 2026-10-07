/** Greek display labels and formatting shared by pages and components. */
import type { WEEKDAYS } from '~/content.config';
import { formatAthens } from './time';

export const DAY_NAMES: Record<(typeof WEEKDAYS)[number], string> = {
  mon: 'Δευτέρα',
  tue: 'Τρίτη',
  wed: 'Τετάρτη',
  thu: 'Πέμπτη',
  fri: 'Παρασκευή',
  sat: 'Σάββατο',
  sun: 'Κυριακή',
};

export const ASSIGNMENT_TYPES = {
  exercise: 'Άσκηση',
  coursework: 'Εργασία',
  exam: 'Εξέταση',
  quiz: 'Κουίζ',
} as const;

export const RESOURCE_KINDS = {
  slides: 'Διαφάνειες',
  video: 'Βίντεο',
  tool: 'Εργαλείο',
  reading: 'Ανάγνωση',
} as const;

/** "Πέμπτη 20 Νοεμβρίου 2026, 23:59" — always Athens time. */
export function formatDeadline(instant: Date): string {
  return formatAthens(instant, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
}

/** "7 Οκτωβρίου 2026" from a "YYYY-MM-DD" calendar date. */
export function formatLocalDate(value: string): string {
  // Noon UTC is the same calendar day in Athens all year round.
  return formatAthens(new Date(`${value}T12:00:00Z`), { day: 'numeric', month: 'long', year: 'numeric' });
}

export function yearSemester(year: number, semester: number): string {
  return `Έτος ${year} · Εξάμηνο ${semester}`;
}
