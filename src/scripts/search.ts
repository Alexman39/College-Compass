/**
 * Site search with Pagefind (the index is built after `astro build`, into
 * dist/pagefind/). Wires up every [data-search] box on the page:
 *
 *   form[data-search]
 *     input[type=search]
 *     [data-search-status]   live region: "3 αποτελέσματα"
 *     ol[data-search-results]
 *
 * Pagefind is only downloaded when someone starts typing, so pages that
 * never search pay nothing. Greek works out of the box: accents and case
 * are ignored and word endings are stemmed (κλάση ↔ κλάσεων).
 */

interface PagefindResult {
  data: () => Promise<{
    url: string;
    excerpt: string;
    meta: { title?: string; kind?: string };
    filters: { course?: string[] };
  }>;
}
interface Pagefind {
  options: (o: { baseUrl: string }) => Promise<void>;
  search: (q: string) => Promise<{ results: PagefindResult[] }>;
}

const BASE = import.meta.env.BASE_URL;
let loading: Promise<Pagefind> | undefined;

function pagefind(): Promise<Pagefind> {
  // @vite-ignore: this file only exists after the build, so Vite must not
  // try to bundle it — the browser fetches it at runtime.
  loading ??= import(/* @vite-ignore */ `${BASE}pagefind/pagefind.js`).then(async (pf: Pagefind) => {
    await pf.options({ baseUrl: BASE });
    return pf;
  });
  return loading;
}

const plural = (n: number) => (n === 1 ? '1 αποτέλεσμα' : `${n} αποτελέσματα`);

function setup(form: HTMLFormElement): void {
  const input = form.querySelector<HTMLInputElement>('input[type="search"]')!;
  const status = form.querySelector<HTMLElement>('[data-search-status]')!;
  const list = form.querySelector<HTMLOListElement>('[data-search-results]')!;
  const limit = Number(form.dataset.limit ?? 20);

  // Results update as you type; Enter shouldn't reload the page.
  form.addEventListener('submit', (e) => e.preventDefault());
  input.addEventListener('focus', () => void pagefind(), { once: true });

  // Wait for a short pause in typing before searching (a "debounce"), and
  // ignore answers to old queries that arrive after newer ones.
  let timer: ReturnType<typeof setTimeout> | undefined;
  let latest = 0;

  const run = async () => {
    const q = input.value.trim();
    const ticket = ++latest;
    if (!q) {
      list.replaceChildren();
      status.textContent = '';
      return;
    }
    status.textContent = 'Αναζήτηση…';
    try {
      const search = await (await pagefind()).search(q);
      const data = await Promise.all(search.results.slice(0, limit).map((r) => r.data()));
      if (ticket !== latest) return; // a newer query is already on its way
      list.replaceChildren(...data.map(renderResult));
      status.textContent = search.results.length ? plural(search.results.length) : `Κανένα αποτέλεσμα για «${q}».`;
    } catch {
      if (ticket === latest) status.textContent = 'Η αναζήτηση δεν είναι διαθέσιμη αυτή τη στιγμή.';
    }
  };

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(run, 180);
  });
  if (input.value) void run(); // e.g. /search/?q=… pre-filled
}

function renderResult(r: Awaited<ReturnType<PagefindResult['data']>>): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'result';

  const top = document.createElement('p');
  top.className = 'result-meta';
  const course = r.filters.course?.[0];
  if (course) {
    const chip = document.createElement('span');
    chip.className = 'result-course';
    chip.textContent = course; // textContent: never trust strings as HTML
    top.append(chip);
  }
  if (r.meta.kind) top.append(document.createTextNode(r.meta.kind));

  const a = document.createElement('a');
  a.href = r.url;
  a.className = 'result-title';
  a.textContent = r.meta.title ?? r.url;

  const excerpt = document.createElement('p');
  excerpt.className = 'result-excerpt';
  // Pagefind's excerpt is our own page text, already HTML-escaped by
  // Pagefind, with <mark> around the matched words.
  excerpt.innerHTML = r.excerpt;

  li.append(top, a, excerpt);
  return li;
}

document.querySelectorAll<HTMLFormElement>('form[data-search]').forEach(setup);
