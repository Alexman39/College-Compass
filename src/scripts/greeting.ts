/**
 * Fills [data-greeting] with "Καλημέρα" / "Καλησπέρα" and [data-today] with
 * today's date, both in Athens time, at the moment the page is viewed (the
 * HTML was built earlier, maybe yesterday).
 */
import { athensWallTime, formatAthens } from '~/lib/time';

const now = new Date();
const hour = athensWallTime(now).hour;
document.querySelectorAll<HTMLElement>('[data-greeting]').forEach((el) => {
  el.textContent = hour >= 5 && hour < 13 ? 'Καλημέρα' : 'Καλησπέρα';
});
document.querySelectorAll<HTMLElement>('[data-today]').forEach((el) => {
  el.textContent = formatAthens(now, { weekday: 'long', day: 'numeric', month: 'long' });
});
