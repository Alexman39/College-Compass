/**
 * Interactive demos inside lesson text. A lesson places one with raw HTML:
 *
 *   <div data-demo="water-jug">…fallback text for no JavaScript…</div>
 *
 * Each demo's code (and CSS) is a separate chunk, loaded only on pages that
 * use it.
 */
const demos: Record<string, () => Promise<{ mount: (root: HTMLElement) => void }>> = {
  'water-jug': () => import('./demos/water-jug'),
};

for (const root of document.querySelectorAll<HTMLElement>('[data-demo]')) {
  const load = demos[root.dataset.demo!];
  if (load) void load().then(({ mount }) => mount(root));
}
