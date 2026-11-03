/**
 * Week browser for /calendar/: shows one week at a time with
 * «← Προηγούμενη / Σήμερα / Επόμενη →». The week is kept in the address
 * (#week-2026-11-09), so a link or a reload opens the same week.
 *
 * Markup (calendar.astro): [data-weeks] holds [data-week-nav] and one
 * section.cal-week[data-week="YYYY-MM-DD"] per week; the page marks the
 * current week with data-shown. CSS hides the others.
 */
const root = document.querySelector<HTMLElement>('[data-weeks]');

if (root) {
  const weeks = [...root.querySelectorAll<HTMLElement>('.cal-week')];
  const nav = root.querySelector<HTMLElement>('[data-week-nav]')!;
  const prev = nav.querySelector<HTMLButtonElement>('[data-step="-1"]')!;
  const next = nav.querySelector<HTMLButtonElement>('[data-step="1"]')!;
  const todayBtn = nav.querySelector<HTMLButtonElement>('[data-today]')!;
  const announce = root.querySelector<HTMLElement>('[data-week-announce]')!;
  const home = Math.max(0, weeks.findIndex((w) => w.hasAttribute('data-shown')));

  const fromHash = () => weeks.findIndex((w) => `#${w.id}` === location.hash);
  let index = fromHash() >= 0 ? fromHash() : home;

  function show(i: number, { focus = false, push = true } = {}) {
    index = Math.min(weeks.length - 1, Math.max(0, i));
    weeks.forEach((w, j) => w.toggleAttribute('data-shown', j === index));
    prev.disabled = index === 0;
    next.disabled = index === weeks.length - 1;
    todayBtn.disabled = index === home;
    const week = weeks[index]!;
    if (push) history.replaceState(null, '', index === home ? location.pathname : `#${week.id}`);
    announce.textContent = week.querySelector('.week-label')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    if (focus) week.querySelector<HTMLElement>('.week-label')?.focus({ preventScroll: true });
  }

  weeks.forEach((w) => w.querySelector('.week-label')?.setAttribute('tabindex', '-1'));
  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  todayBtn.addEventListener('click', () => show(home));
  addEventListener('hashchange', () => {
    const i = fromHash();
    if (i >= 0) show(i, { push: false });
  });

  nav.hidden = false;
  show(index, { push: false });
}
