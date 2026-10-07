/**
 * The visitor's "done" ticks, kept only in their own browser (localStorage).
 * Nothing is sent anywhere. Keys are assignment ids, e.g.
 * "cn4003/week-01-exercise-1".
 *
 * Every change fires a "cc:ticks" event on window, so all parts of the page
 * (pills, the reset button) stay in sync. Other open tabs hear about it
 * through the browser's own "storage" event.
 */
const KEY = 'cc-ticks-v1';
export const TICKS_EVENT = 'cc:ticks';

export function readTicks(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    // Blocked storage (private mode, strict settings) or corrupt data:
    // behave as if nothing is ticked rather than breaking the page.
    return new Set();
  }
}

function write(ticks: Set<string>): void {
  try {
    if (ticks.size) localStorage.setItem(KEY, JSON.stringify([...ticks].sort()));
    else localStorage.removeItem(KEY);
  } catch {
    // Can't persist — the tick still shows until the page is reloaded.
  }
  window.dispatchEvent(new CustomEvent(TICKS_EVENT));
}

export function setTick(id: string, done: boolean): void {
  const ticks = readTicks();
  if (done) ticks.add(id);
  else ticks.delete(id);
  write(ticks);
}

export function clearTicks(): void {
  write(new Set());
}

/** Run `fn` now and whenever ticks change in this tab or another one. */
export function onTicksChange(fn: () => void): void {
  window.addEventListener(TICKS_EVENT, fn);
  window.addEventListener('storage', (e) => {
    if (e.key === KEY || e.key === null) fn();
  });
}
