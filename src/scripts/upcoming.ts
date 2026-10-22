/**
 * Keeps the time-sensitive deadline views right in the browser:
 *
 *  - [data-next-deadline]  shows the soonest deadline you haven't ticked,
 *                          with a live countdown
 *  - [data-upcoming-list="next"]     due from now to the end of day 14
 *  - [data-upcoming-list="overdue"]  missed in the last 7 days, not ticked
 *
 * The page is built ahead of time with every candidate item in it; this
 * script only shows and hides them, so without JavaScript the build-time
 * selection still makes sense.
 */
import { upcomingUntil } from '~/lib/derive';
import { formatCountdown } from '~/lib/status';
import { onTicksChange, readTicks } from './tick-store';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const dueOf = (el: HTMLElement) => new Date(el.dataset.due!).getTime();

function refresh(): void {
  const now = Date.now();
  const ticks = readTicks();

  document.querySelectorAll<HTMLElement>('[data-next-deadline]').forEach((box) => {
    const items = [...box.querySelectorAll<HTMLElement>('[data-next-item]')];
    const pick = items.find((el) => dueOf(el) > now && !ticks.has(el.dataset.assignment!));
    items.forEach((el) => (el.hidden = el !== pick));
    if (pick) pick.querySelector('[data-countdown]')!.textContent = formatCountdown(dueOf(pick) - now);
    box.querySelector<HTMLElement>('[data-next-empty]')!.hidden = Boolean(pick);
  });

  const until = upcomingUntil(new Date(now)).getTime();
  document.querySelectorAll<HTMLElement>('[data-upcoming-list]').forEach((list) => {
    const overdue = list.dataset.upcomingList === 'overdue';
    let shown = 0;
    list.querySelectorAll<HTMLElement>('[data-upcoming-item]').forEach((li) => {
      const due = dueOf(li);
      const show = overdue
        ? due < now && due >= now - WEEK_MS && !ticks.has(li.dataset.assignment!)
        : due >= now && due < until;
      li.hidden = !show;
      if (show) shown++;
    });
    const section = list.closest<HTMLElement>('[data-upcoming-section]');
    if (overdue && section) section.hidden = shown === 0;
    const empty = section?.querySelector<HTMLElement>('[data-upcoming-empty]');
    if (empty) empty.hidden = shown > 0;
  });
}

refresh();
onTicksChange(refresh);
setInterval(refresh, 30_000);
