/**
 * Decision Tree Walkthrough (CN6005 Week 5, optional): pick an example,
 * predict the tree's answer, then see the path from the root to a leaf and
 * compare with the true label when it is known. Trees: the lesson's spam
 * filter and the lecture's loan approval (slide 17).
 * Logic: src/lib/ml-lab.ts (tested).
 */
import { classify, DTREES, type TreeNode } from '~/lib/ml-lab';
import { button, card, h, predictBox } from './ml-ui';

export function mount(root: HTMLElement): void {
  let ti = 0, si = 0;
  let revealed = false;
  card(root, 'Decision Tree Walkthrough', 'Διάλεξε δέντρο και παράδειγμα. Πρόβλεψε πρώτα τι θα απαντήσει το δέντρο· μετά δες τη διαδρομή από τη ρίζα ως το φύλλο.');
  const treeRow = h('div', { class: 'ml-row', role: 'group', 'aria-label': 'Δέντρο' });
  const treeBtns = DTREES.map((t, i) => button(t.label, () => { ti = i; si = 0; revealed = false; render(); }));
  treeRow.append(...treeBtns);
  const sampleRow = h('div', { class: 'ml-row', role: 'group', 'aria-label': 'Παράδειγμα' });
  const values = h('p', { class: 'ml-note' });
  const ask = h('div');
  const treeList = h('ul', { class: 'ml-tree', 'aria-label': 'Το δέντρο' });
  const result = h('p', { class: 'ml-fb', 'aria-live': 'polite' });
  root.append(treeRow, sampleRow, values, ask, treeList, result);

  function render() {
    const t = DTREES[ti]!;
    const smp = t.samples[si]!;
    const out = classify(t, smp);
    treeBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === ti)));
    sampleRow.replaceChildren(...t.samples.map((x, i) => { const b = button(x.id.split(':')[0]!, () => { si = i; revealed = false; render(); }); b.setAttribute('aria-pressed', String(i === si)); return b; }));
    const fmtV = (v: string | number | boolean) => (v === true ? 'ναι' : v === false ? 'όχι' : typeof v === 'number' ? v.toLocaleString('el-GR') : v);
    values.textContent = `${smp.id}. ${t.keys.map(([k, lab]) => `${lab}: ${fmtV(smp.values[k]!)}`).join(' · ')}`;

    ask.replaceChildren();
    const labels = [...new Set(t.samples.map((x) => classify(t, x).label))];
    if (!revealed) ask.append(predictBox('τι θα προβλέψει το δέντρο για αυτό το παράδειγμα;', labels, out.label, `Η διαδρομή: ${out.path.map((p) => `${p.q} ${p.answer}`).join(' → ')} → ${out.label}.`, () => { revealed = true; render(); }));

    treeList.replaceChildren();
    const onPath = new Set(out.path.map((p) => `${p.q}|${p.answer}`));
    // The root question gets its own line; a question reached by a branch is
    // written on that branch's line («όχι → Περιέχει ύποπτη λέξη;»).
    const walk = (n: TreeNode, depth: number, active: boolean, top = true) => {
      if (n.label) return;
      if (top) {
        const q = h('li', { style: `margin-left:${depth * 1.5}rem` }, n.q!);
        if (revealed && active) q.classList.add('on');
        treeList.append(q);
      }
      for (const b of n.branches!) {
        const on = revealed && active && onPath.has(`${n.q}|${b.answer}`);
        const li = h('li', { style: `margin-left:${(depth + 1) * 1.5}rem` }, `${b.answer} → ${b.node.label ? `πρόβλεψη: ${b.node.label}` : b.node.q}`);
        if (on) li.classList.add('on');
        treeList.append(li);
        walk(b.node, depth + 1, on, false);
      }
    };
    walk(t.root, 0, true);

    result.hidden = !revealed;
    result.className = 'ml-fb';
    if (revealed) {
      if (smp.truth === undefined) result.textContent = `Πρόβλεψη: ${out.label}. Για τους αιτούντες δεν ξέρουμε τη σωστή απάντηση: γι’ αυτό ακριβώς χρησιμοποιούμε το μοντέλο.`;
      else {
        const ok = smp.truth === out.label;
        result.classList.add(ok ? 'ok' : 'bad');
        result.textContent = ok ? `Πρόβλεψη: ${out.label}. Σωστή απάντηση: ${smp.truth}. Το δέντρο πέτυχε.` : `Πρόβλεψη: ${out.label}, αλλά η σωστή απάντηση είναι ${smp.truth}. Το δέντρο έκανε λάθος: ένα μοντέλο μαθαίνει από παραδείγματα και δεν είναι αλάνθαστο. Γι’ αυτό το ελέγχουμε σε δεδομένα ελέγχου.`;
      }
    }
  }

  render();
}
