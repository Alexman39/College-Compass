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
  // CN6003 labs
  'sec-cia': () => import('./demos/sec-classify'),
  'sec-attacks': () => import('./demos/sec-classify'),
  'sec-risk': () => import('./demos/sec-risk'),
  'sec-mccumber': () => import('./demos/sec-mccumber'),
  'sec-attack-tree': () => import('./demos/sec-attack-tree'),
  'sec-firewall': () => import('./demos/sec-firewall'),
  'sec-netattack': () => import('./demos/sec-netattack'),
  'sec-caesar': () => import('./demos/sec-cipher'),
  'sec-vigenere': () => import('./demos/sec-cipher'),
  'sec-euclid': () => import('./demos/sec-euclid'),
  'sec-rsa': () => import('./demos/sec-rsa'),
  'sec-lsb': () => import('./demos/sec-lsb'),
  'sec-tls': () => import('./demos/sec-tls'),
  'sec-packet': () => import('./demos/sec-packet'),
  'sec-frag': () => import('./demos/sec-frag'),
  'sec-tcp': () => import('./demos/sec-tcp'),
  'sec-traffic': () => import('./demos/sec-traffic'),
  'sec-unix': () => import('./demos/sec-terminal'),
  'sec-wincmd': () => import('./demos/sec-terminal'),
  'sec-chmod': () => import('./demos/sec-chmod'),
  'sec-pat': () => import('./demos/sec-pentest'),
  'sec-password': () => import('./demos/sec-pentest'),
  'sec-hats': () => import('./demos/sec-pentest'),
};

for (const root of document.querySelectorAll<HTMLElement>('[data-demo]')) {
  const load = demos[root.dataset.demo!];
  if (load) void load().then(({ mount }) => mount(root));
}
