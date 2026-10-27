# CN6005 Week 4 diagrams: Minimax tree, Alpha-Beta tree, tic-tac-toe.
# Run: python3 scripts/diagrams/cn6005-week4.py src/content/lessons/cn6005/images
# The tic-tac-toe values were checked with a full Minimax search.
# Generates the three Week 4 diagrams. Positions are computed from the tree
# structure, so nodes, edges and labels always line up exactly.
import sys
OUT = sys.argv[1]
INK, MUTED, EDGE, ACC, ACC_BG, MIN_BG = '#0c2636', '#4a5a65', '#7b8a94', '#841387', '#f3e6f4', '#eef3f6'
PRUNE, CUT = '#b9c3c9', '#c62828'
FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif"
W = 500
LEAVES = [[6, 8, 4], [3, 11, 7], [9, 5, 10]]
MOVES = ['A', 'B', 'C']

def svg(h, title, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {h}" width="{W}" height="{h}" font-family="{FONT}">\n'
            f'  <title>{title}</title>\n  <rect width="{W}" height="{h}" fill="#ffffff"/>\n' + '\n'.join('  ' + b for b in body) + '\n</svg>\n')

def text(x, y, s, size, weight=400, fill=INK, anchor='middle'):
    return f'<text x="{x:g}" y="{y:g}" text-anchor="{anchor}" font-size="{size}" font-weight="{weight}" fill="{fill}">{s}</text>'

def tree(alpha_beta):
    body = []
    leaf_x = [40 + i * 52.5 for i in range(9)]           # 40 … 460
    min_x = [leaf_x[3 * k + 1] for k in range(3)]         # middle leaf of each group
    root = (250, 62)
    min_y, leaf_y = 160, 262                              # MIN centre, leaf box top
    pruned = {(1, 1), (1, 2)} if alpha_beta else set()
    values = [min(g) for g in LEAVES]
    best = values.index(max(values))                      # C
    # legend
    body.append(text(16, 26, '▲ MAX', 15, 700, MUTED, 'start'))
    body.append(text(16, 46, '▼ MIN', 15, 700, MUTED, 'start'))
    # edges root → MIN
    for k, x in enumerate(min_x):
        col, w = (ACC, 4) if k == best else (EDGE, 2)
        body.append(f'<line x1="{root[0]}" y1="{root[1] + 20}" x2="{x:g}" y2="{min_y - 22}" stroke="{col}" stroke-width="{w}"/>')
    # edges MIN → leaves
    for k, x in enumerate(min_x):
        chosen = LEAVES[k].index(values[k])
        for j in range(3):
            lx = leaf_x[3 * k + j]
            if (k, j) in pruned:
                body.append(f'<line x1="{x:g}" y1="{min_y + 22}" x2="{lx:g}" y2="{leaf_y}" stroke="{PRUNE}" stroke-width="2" stroke-dasharray="6 5"/>')
            elif not alpha_beta and j == chosen:
                body.append(f'<line x1="{x:g}" y1="{min_y + 22}" x2="{lx:g}" y2="{leaf_y}" stroke="{ACC}" stroke-width="4"/>')
            else:
                body.append(f'<line x1="{x:g}" y1="{min_y + 22}" x2="{lx:g}" y2="{leaf_y}" stroke="{EDGE}" stroke-width="2"/>')
    if alpha_beta:  # cut mark across the two pruned edges of B
        y = min_y + 52
        body.append(f'<line x1="{min_x[1] - 6:g}" y1="{y}" x2="{leaf_x[5] + 6:g}" y2="{y}" stroke="{CUT}" stroke-width="3" stroke-linecap="round"/>')
    # root (MAX, triangle up)
    rx, ry = root
    body.append(f'<polygon points="{rx},{ry - 26} {rx - 32},{ry + 20} {rx + 32},{ry + 20}" fill="{ACC_BG}" stroke="{ACC}" stroke-width="3"/>')
    body.append(text(rx, ry + 14, str(max(values)), 22, 800))
    # MIN nodes (triangle down)
    for k, x in enumerate(min_x):
        on = k == best
        body.append(f'<polygon points="{x - 32:g},{min_y - 22} {x + 32:g},{min_y - 22} {x:g},{min_y + 24}" fill="{ACC_BG if on else MIN_BG}" stroke="{ACC if on else MUTED}" stroke-width="2.5"/>')
        label = ('≤3' if alpha_beta and k == 1 else str(values[k]))
        body.append(text(x, min_y + 1, label, 22, 800))
        body.append(text(x + 44, min_y + 2, MOVES[k], 19, 700, ACC if on else MUTED))
    # leaves
    for k in range(3):
        for j in range(3):
            lx = leaf_x[3 * k + j]; v = LEAVES[k][j]
            if (k, j) in pruned:
                body.append(f'<rect x="{lx - 22:g}" y="{leaf_y}" width="44" height="38" rx="6" fill="#f4f6f7" stroke="{PRUNE}" stroke-width="2" stroke-dasharray="5 4"/>')
                body.append(text(lx, leaf_y + 26, v, 20, 700, '#5b6a73'))
            else:
                hi = (not alpha_beta) and v == values[k]
                body.append(f'<rect x="{lx - 22:g}" y="{leaf_y}" width="44" height="38" rx="6" fill="{ACC_BG if hi else "#ffffff"}" stroke="{ACC if hi else EDGE}" stroke-width="{3 if hi else 2}"/>')
                body.append(text(lx, leaf_y + 26, v, 20, 700))
    if alpha_beta:
        order = [lx for k in range(3) for j, lx in enumerate(leaf_x[3 * k:3 * k + 3]) if (k, j) not in pruned]
        for n, lx in enumerate(order, 1):
            body.append(text(lx, leaf_y + 60, f'{n}ο', 15, 700, MUTED))
        body.append(text(W / 2, 352, 'A = 4 → α = 4. Στο B το 3 ≤ α → κλάδεμα.', 17, 400, MUTED))
        body.append(text(W / 2, 376, 'C = 5 > 4 → α = 5. Παίζει C, τιμή 5.', 17, 400, MUTED))
        body.append(text(W / 2, 400, '7 φύλλα αντί για 9: τα 11 και 7 δεν αξιολογούνται.', 17, 400, MUTED))
        return svg(416, 'Το ίδιο δένδρο με Alpha-Beta', body)
    body.append(text(W / 2, 332, 'Κάθε MIN κρατά το μικρότερο φύλλο του.', 17, 400, MUTED))
    body.append(text(W / 2, 356, 'Ο MAX παίρνει το μεγαλύτερο: max(4, 3, 5) = 5 → C.', 17, 400, MUTED))
    return svg(372, 'Δένδρο Minimax', body)

def tictactoe():
    root = 'XXOOX   O'
    kids = [(5, '0', 'ισοπαλία'), (6, '−1', 'ήττα'), (7, '+1', 'νίκη')]
    body = []
    def board(b, x, y, cell, new=None):
        out = [f'<rect x="{x}" y="{y}" width="{3 * cell}" height="{3 * cell}" rx="4" fill="#ffffff" stroke="{MUTED}" stroke-width="2"/>']
        for i in range(9):
            r, c = divmod(i, 3); cx, cy = x + c * cell + cell / 2, y + r * cell + cell / 2; d = cell * 0.3
            if i == new:
                out.append(f'<rect x="{x + c * cell + 2:g}" y="{y + r * cell + 2:g}" width="{cell - 4}" height="{cell - 4}" fill="{ACC_BG}"/>')
            if b[i] == 'X':
                col, w = (ACC, 4.5) if i == new else (INK, 3.5)
                out.append(f'<path d="M{cx - d:g} {cy - d:g}L{cx + d:g} {cy + d:g}M{cx + d:g} {cy - d:g}L{cx - d:g} {cy + d:g}" stroke="{col}" stroke-width="{w}" stroke-linecap="round"/>')
            elif b[i] == 'O':
                out.append(f'<circle cx="{cx:g}" cy="{cy:g}" r="{d + 1:g}" fill="none" stroke="{INK}" stroke-width="3.5"/>')
        for k in (1, 2):
            out.append(f'<line x1="{x + k * cell}" y1="{y}" x2="{x + k * cell}" y2="{y + 3 * cell}" stroke="{MUTED}" stroke-width="1.5"/>')
            out.append(f'<line x1="{x}" y1="{y + k * cell}" x2="{x + 3 * cell}" y2="{y + k * cell}" stroke="{MUTED}" stroke-width="1.5"/>')
        return out
    rc = 40; rx, ry = W / 2 - 1.5 * rc, 40
    body.append(text(W / 2, 26, 'Παίζει ο X (MAX)', 18, 700, MUTED))
    body += board(root, rx, ry, rc)
    cc = 34; centres = [85, 250, 415]; ky = 236
    for (idx, val, word), cx in zip(kids, centres):
        win = val == '+1'
        body.append(f'<line x1="{W / 2}" y1="{ry + 3 * rc}" x2="{cx}" y2="{ky - 34}" stroke="{ACC if win else EDGE}" stroke-width="{4 if win else 2}"/>')
        r, c = divmod(idx, 3)
        body.append(text(cx, ky - 12, f'γρ. {r + 1}, στ. {c + 1}', 16, 700, MUTED))
        body += board(root[:idx] + 'X' + root[idx + 1:], cx - 1.5 * cc, ky, cc, new=idx)
        body.append(text(cx, ky + 3 * cc + 28, f'{val} {word}', 19, 800, ACC if win else INK))
    body.append(text(W / 2, 410, 'Τιμές για τον X: +1 νίκη, 0 ισοπαλία, −1 ήττα.', 17, 400, MUTED))
    body.append(text(W / 2, 434, 'Ο X διαλέγει τη μέγιστη, +1: τρίλιζα στη μεσαία στήλη.', 17, 400, MUTED))
    return svg(450, 'Minimax στην τρίλιζα', body)

open(f'{OUT}/minimax-tree.svg', 'w').write(tree(False))
open(f'{OUT}/alpha-beta-tree.svg', 'w').write(tree(True))
open(f'{OUT}/tic-tac-toe-minimax.svg', 'w').write(tictactoe())
print('ok')
