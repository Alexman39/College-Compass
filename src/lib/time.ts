/**
 * Everything to do with dates and times, pinned to Europe/Athens.
 *
 * Why this exists: the build machine (GitHub Actions) runs in UTC and a
 * visitor's browser might be anywhere, but "due 23:59" always means 23:59 in
 * Athens. Content therefore stores *Athens wall-clock time* ("2026-03-14T23:59")
 * and this module converts it to a real instant (a Date), handling the
 * summer/winter clock changes (EET +02:00 ⇄ EEST +03:00).
 *
 * No date library: Intl.DateTimeFormat already knows the time-zone rules.
 */

export const TZ = 'Europe/Athens';

/** "YYYY-MM-DDTHH:mm" — the format used for `due` / `released` in content. */
export const LOCAL_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
/** "YYYY-MM-DD" — calendar dates (lesson dates, holidays, semester starts). */
export const LOCAL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// One formatter, reused: creating Intl formatters is relatively expensive.
const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

interface WallTime {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number;
  minute: number;
}

/** What an Athens wall clock shows at the given instant. */
export function athensWallTime(instant: Date): WallTime & { second: number } {
  const p: Record<string, number> = {};
  for (const { type, value } of partsFormatter.formatToParts(instant)) {
    if (type !== 'literal') p[type] = Number(value);
  }
  return {
    year: p.year!,
    month: p.month!,
    day: p.day!,
    hour: p.hour!,
    minute: p.minute!,
    second: p.second!,
  };
}

/** Athens' offset from UTC in ms at the given instant (+2h or +3h). */
function athensOffsetMs(instant: Date): number {
  const w = athensWallTime(instant);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

export type ParseResult = { ok: true; date: Date } | { ok: false; reason: string };

/**
 * "2026-03-14T23:59" (Athens time) → the exact instant.
 * Fails with a human-readable reason for malformed input, impossible dates
 * (Feb 30) and times skipped by the spring clock change (03:00–03:59 on the
 * last Sunday of March).
 */
export function parseAthensDateTime(value: string): ParseResult {
  const m = LOCAL_DATETIME_RE.exec(value);
  if (!m) {
    return { ok: false, reason: `"${value}" is not in the form YYYY-MM-DDTHH:mm (e.g. 2026-03-14T23:59)` };
  }
  const [year, month, day, hour, minute] = m.slice(1).map(Number) as [number, number, number, number, number];

  if (!isRealDate(year, month, day) || hour > 23 || minute > 59) {
    return { ok: false, reason: `"${value}" is not a real date/time` };
  }

  // Treat the wall time as if it were UTC, then subtract Athens' offset.
  // Doing it twice settles the right side of a DST change.
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  let instant = new Date(naive - athensOffsetMs(new Date(naive)));
  instant = new Date(naive - athensOffsetMs(instant));

  const check = athensWallTime(instant);
  if (check.hour !== hour || check.minute !== minute || check.day !== day) {
    return { ok: false, reason: `"${value}" does not exist in Athens (clocks jump forward that night)` };
  }

  // Autumn: 03:00–03:59 happens twice when clocks go back. Pick the earlier
  // one (same rule as JavaScript's Temporal), so a deadline is never shown
  // later than it could really be.
  const hourEarlier = new Date(instant.getTime() - 60 * 60 * 1000);
  const e = athensWallTime(hourEarlier);
  if (e.hour === hour && e.minute === minute && e.day === day) instant = hourEarlier;

  return { ok: true, date: instant };
}

/** True for "YYYY-MM-DD" strings that name a real calendar day. */
export function isLocalDate(value: string): boolean {
  const m = LOCAL_DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = m.slice(1).map(Number) as [number, number, number];
  return isRealDate(y, mo, d);
}

function isRealDate(year: number, month: number, day: number): boolean {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/** Format an instant for display, always in Athens time, Greek locale. */
export function formatAthens(instant: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('el-GR', { timeZone: TZ, ...options }).format(instant);
}
