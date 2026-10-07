/**
 * Assignment status, computed from dates — the same code runs at build time
 * (for the first paint) and in the browser (so a page built days ago still
 * shows the right pill). Only "done" is not computed here: it comes from the
 * visitor's own tick, stored in their browser (src/scripts/ticks.ts).
 */
/** done = ticked by the visitor; the rest are computed from dates. */
export type Status = 'done' | 'soon' | 'overdue' | 'locked' | 'open';

/** Default pill labels (Greek). */
export const STATUS_LABELS: Record<Status, string> = {
  done: 'Ολοκληρώθηκε',
  soon: 'Λήγει σύντομα',
  overdue: 'Εκπρόθεσμο',
  locked: 'Δεν έχει ανοίξει',
  open: 'Ανοιχτό',
};

/** "Due soon" window: 72 hours. */
export const SOON_MS = 72 * 60 * 60 * 1000;

export interface Dates {
  released?: Date | undefined;
  due?: Date | undefined;
}

export function timeStatus({ released, due }: Dates, now: Date): Exclude<Status, 'done'> {
  if (released && now < released) return 'locked';
  if (!due) return 'open';
  if (now > due) return 'overdue';
  if (due.getTime() - now.getTime() <= SOON_MS) return 'soon';
  return 'open';
}

const relative = new Intl.RelativeTimeFormat('el', { numeric: 'auto' });

/**
 * Short Greek label for the pill, e.g. "Λήγει σε 14 ώρες".
 * Returns undefined to use the pill's default label.
 */
export function statusLabel(status: Status, { released, due }: Dates, now: Date): string | undefined {
  if (status === 'soon' && due) return `Λήγει ${relativeFrom(due, now)}`;
  if (status === 'locked' && released) return `Ανοίγει ${relativeFrom(released, now)}`;
  return undefined;
}

/** "σε 14 ώρες", "αύριο", "σε 3 ημέρες" — rounded to the largest sensible unit. */
function relativeFrom(target: Date, now: Date): string {
  const minutes = Math.round((target.getTime() - now.getTime()) / 60_000);
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) return relative.format(hours, 'hour');
  return relative.format(Math.round(hours / 24), 'day');
}
