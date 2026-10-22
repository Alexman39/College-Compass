/**
 * Keeps every assignment's status pill current, in the browser.
 *
 * The HTML is built ahead of time, so the pills it contains are only right
 * for the moment of the build. This script recomputes them from the dates
 * on load and every minute, and applies the visitor's own ticks (green
 * "done"). Without JavaScript the build-time pills still show, and the
 * tick checkboxes simply stay hidden.
 *
 * Markup it looks for (rendered by AssignmentItem / AssignmentRow):
 *   [data-assignment="<id>"][data-due="<iso>"][data-released="<iso>"]
 *     [data-pill] > [data-pill-label]      the pill to update
 *     [data-tick] > input[type=checkbox]   the tick (full item only)
 */
import { STATUS_LABELS, statusLabel, timeStatus, type Status } from '~/lib/status';
import { onTicksChange, readTicks, setTick } from './tick-store';

const parse = (value: string | undefined) => (value ? new Date(value) : undefined);

function refresh(): void {
  const ticks = readTicks();
  const now = new Date();

  document.querySelectorAll<HTMLElement>('[data-assignment]').forEach((el) => {
    const id = el.dataset.assignment!;
    const dates = { due: parse(el.dataset.due), released: parse(el.dataset.released) };
    const status: Status = ticks.has(id) ? 'done' : timeStatus(dates, now);

    const pill = el.querySelector<HTMLElement>('[data-pill]');
    if (pill && pill.dataset.status !== status) {
      pill.dataset.status = status;
    }
    const label = pill?.querySelector<HTMLElement>('[data-pill-label]');
    if (label) label.textContent = statusLabel(status, dates, now) ?? STATUS_LABELS[status];

    const box = el.querySelector<HTMLInputElement>('[data-tick] input');
    if (box) box.checked = ticks.has(id);
  });
}

function init(): void {
  document.querySelectorAll<HTMLElement>('[data-tick]').forEach((tick) => {
    tick.hidden = false;
    const box = tick.querySelector('input')!;
    const item = tick.closest<HTMLElement>('[data-assignment]')!;
    box.addEventListener('change', () => {
      setTick(item.dataset.assignment!, box.checked);
      if (box.checked) {
        // Every pill for this assignment on the page "pops".
        document
          .querySelectorAll<HTMLElement>(`[data-assignment="${CSS.escape(item.dataset.assignment!)}"] [data-pill]`)
          .forEach((pill) => {
            pill.classList.remove('pop');
            void pill.offsetWidth; // restart the animation if ticked again
            pill.classList.add('pop');
          });
      }
    });
  });

  refresh();
  onTicksChange(refresh);
  // Countdowns ("Λήγει σε 14 ώρες") and soon → overdue changes.
  setInterval(refresh, 60_000);
}

init();
