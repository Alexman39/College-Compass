/**
 * Interactive demos inside lesson text. A lesson places one with raw HTML:
 *
 *   <div data-demo="search-explorer">…fallback text for no JavaScript…</div>
 *
 * Each demo's code (and CSS) is a separate chunk, loaded only on pages that
 * use it.
 */
const demos: Record<string, () => Promise<{ mount: (root: HTMLElement) => void }>> = {
  'search-explorer': () => import('./demos/search-explorer'),
  'heuristic-explorer': () => import('./demos/heuristic-explorer'),
  'game-tree': () => import('./demos/game-tree'),
  tictactoe: () => import('./demos/tictactoe'),
  'ml-regression': () => import('./demos/ml-regression'),
  'ml-preprocess': () => import('./demos/ml-preprocess'),
  'ml-kmeans': () => import('./demos/ml-kmeans'),
  'ml-assoc': () => import('./demos/ml-assoc'),
  'ml-dtree': () => import('./demos/ml-dtree'),
};

for (const root of document.querySelectorAll<HTMLElement>('[data-demo]')) {
  const load = demos[root.dataset.demo!];
  if (load) void load().then(({ mount }) => mount(root));
}
