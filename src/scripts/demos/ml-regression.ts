/**
 * Regression Playground (CN6005 Week 5, priority 1): the four study-hours
 * points, sliders for β₀ and β₁, the live line, the residuals, the MSE, and
 * «Βρες την καλύτερη ευθεία». Numbers from src/lib/ml-lab.ts (tested).
 */
import { fit, mse, predict, STUDY } from '~/lib/ml-lab';
import { button, card, h, num, predictBox, s, table } from './ml-ui';

const W = 560, H = 340, L = 56, R = 20, T = 20, B = 48;
const X0 = 0, X1 = 6, Y0 = 40, Y1 = 85;
const px = (x: number) => L + ((x - X0) / (X1 - X0)) * (W - L - R);
const py = (y: number) => T + (1 - (y - Y0) / (Y1 - Y0)) * (H - T - B);

export function mount(root: HTMLElement): void {
  const best = fit(STUDY.x, STUDY.y);
  let b0 = 60, b1 = 0;
  let showBest = false;
  card(root, 'Regression Playground', 'Μετακίνησε τα β₀ (τομή) και β₁ (κλίση) και δες πώς αλλάζουν τα υπόλοιπα (κόκκινες διακεκομμένες) και το μέσο τετραγωνικό σφάλμα (MSE). Στόχος: το μικρότερο MSE.');

  const s0 = h('input', { type: 'range', min: '30', max: '70', step: '0.5', value: String(b0), 'aria-label': 'β₀, τομή' });
  const s1 = h('input', { type: 'range', min: '-2', max: '12', step: '0.1', value: String(b1), 'aria-label': 'β₁, κλίση' });
  const v0 = h('output'), v1 = h('output');
  const l0 = h('label', {}, 'β₀ '), l1 = h('label', {}, 'β₁ ');
  l0.append(s0, v0);
  l1.append(s1, v1);
  const sliders = h('div', { class: 'ml-row' });
  sliders.append(l0, l1);

  const chart = h('div', { class: 'ml-chart' });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('role', 'img');
  chart.append(svg);
  const stats = h('div', { class: 'ml-stats' });
  const why = h('p', { class: 'ml-note', 'aria-live': 'polite' });
  const actions = h('div', { class: 'ml-row' });
  const tableWrap = h('div');

  const predictArea = h('div');
  predictArea.append(predictBox(
    'πόσο θα προβλέψει η καλύτερη ευθεία για 5 ώρες μελέτης;',
    ['69', '73,5', '78', '80'], '73,5',
    `Η ευθεία ελαχίστων τετραγώνων είναι ŷ = ${num(best.b0)} + ${num(best.b1)}x, άρα για x = 5: ${num(best.b0)} + ${num(best.b1)} · 5 = ${num(predict(best.b0, best.b1, 5))}.`,
    () => { showBest = true; setLine(best.b0, best.b1); },
  ));

  actions.append(
    button('Βρες την καλύτερη ευθεία', () => { showBest = true; setLine(best.b0, best.b1); }, 'primary'),
    button('↺ Reset', () => { showBest = false; setLine(60, 0); }),
  );
  root.append(predictArea, sliders, chart, stats, actions, why, tableWrap);

  function setLine(a: number, b: number) {
    b0 = a; b1 = b;
    s0.value = String(a); s1.value = String(b);
    render();
  }
  s0.addEventListener('input', () => { b0 = Number(s0.value); render(); });
  s1.addEventListener('input', () => { b1 = Number(s1.value); render(); });

  function render() {
    v0.textContent = num(b0, 2);
    v1.textContent = num(b1, 2);
    svg.replaceChildren();
    for (let y = 40; y <= 80; y += 10) {
      s('line', { x1: L, x2: W - R, y1: py(y), y2: py(y), class: 'ml-grid' }, svg);
      s('text', { x: L - 8, y: py(y) + 4, 'text-anchor': 'end', class: 'ml-tick' }, svg).textContent = String(y);
    }
    for (let x = 0; x <= 6; x++) s('text', { x: px(x), y: H - B + 18, 'text-anchor': 'middle', class: 'ml-tick' }, svg).textContent = String(x);
    s('line', { x1: L, x2: W - R, y1: H - B, y2: H - B, class: 'ml-baseline' }, svg);
    s('text', { x: (L + W - R) / 2, y: H - 8, 'text-anchor': 'middle', class: 'ml-axis' }, svg).textContent = 'Ώρες μελέτης (x)';
    s('text', { x: 14, y: 14, class: 'ml-axis' }, svg).textContent = 'Βαθμός (y)';
    const clipY = (y: number) => Math.max(Y0, Math.min(Y1, y));
    if (showBest && (Math.abs(b0 - best.b0) > 1e-9 || Math.abs(b1 - best.b1) > 1e-9)) {
      s('line', { x1: px(X0), y1: py(clipY(predict(best.b0, best.b1, X0))), x2: px(X1), y2: py(clipY(predict(best.b0, best.b1, X1))), class: 'ml-best' }, svg);
    }
    s('line', { x1: px(X0), y1: py(clipY(predict(b0, b1, X0))), x2: px(X1), y2: py(clipY(predict(b0, b1, X1))), class: 'ml-line' }, svg);
    STUDY.x.forEach((x, i) => {
      const y = STUDY.y[i]!, yh = predict(b0, b1, x);
      s('line', { x1: px(x), x2: px(x), y1: py(y), y2: py(clipY(yh)), class: 'ml-resid' }, svg);
    });
    STUDY.x.forEach((x, i) => {
      const y = STUDY.y[i]!, yh = predict(b0, b1, x);
      const g = s('g', { tabindex: 0, role: 'img', 'aria-label': `${x} ώρες, βαθμός ${y}, πρόβλεψη ${num(yh)}, υπόλοιπο ${num(y - yh)}` }, svg);
      s('circle', { cx: px(x), cy: py(y), r: 7, class: 'ml-point' }, g);
      s('circle', { cx: px(x), cy: py(y), r: 16, fill: 'transparent' }, g);
      s('title', {}, g).textContent = `x = ${x}, y = ${y} · ŷ = ${num(yh)} · υπόλοιπο ${num(y - yh)}`;
    });
    const y5 = predict(b0, b1, 5);
    s('circle', { cx: px(5), cy: py(clipY(y5)), r: 5, fill: 'none', stroke: 'currentColor', class: 'ml-line' }, svg);
    s('text', { x: px(5) + 10, y: py(clipY(y5)) - 8, class: 'ml-label' }, svg).textContent = `x = 5 → ${num(y5)}`;
    svg.setAttribute('aria-label', `Η ευθεία ŷ = ${num(b0)} + ${num(b1)}x πάνω στα τέσσερα σημεία. MSE ${num(mse(STUDY.x, STUDY.y, b0, b1))}.`);

    const e = mse(STUDY.x, STUDY.y, b0, b1), eb = mse(STUDY.x, STUDY.y, best.b0, best.b1);
    stats.replaceChildren(...([
      ['Ευθεία', `ŷ = ${num(b0)} + ${num(b1)}x`],
      ['MSE', num(e)],
      ['Μικρότερο δυνατό MSE', showBest ? num(eb) : '?'],
      ['Πρόβλεψη για 5 ώρες', num(y5)],
    ] as [string, string][]).map(([k, v]) => { const c = h('div', { class: 'ml-stat' }); c.append(h('span', {}, k), h('strong', {}, v)); return c; }));
    why.textContent = Math.abs(e - eb) < 1e-9
      ? `Αυτή είναι η ευθεία ελαχίστων τετραγώνων: κανένα άλλο ζεύγος β₀, β₁ δεν δίνει μικρότερο MSE (${num(eb)}). Το μοντέλο «έμαθε» δύο αριθμούς, την τομή και την κλίση.`
      : `Το MSE είναι ο μέσος όρος των τετραγώνων των υπολοίπων (κόκκινες γραμμές). Όσο πιο κοντά περνά η ευθεία από τα σημεία, τόσο μικρότερο γίνεται.`;
    tableWrap.replaceChildren(table(['x (ώρες)', 'y (βαθμός)', 'ŷ', 'υπόλοιπο y − ŷ'], STUDY.x.map((x, i) => [x, STUDY.y[i]!, predict(b0, b1, x), STUDY.y[i]! - predict(b0, b1, x)]), 'Τα σημεία, η πρόβλεψη της ευθείας και το υπόλοιπο'));
  }
  render();
}
