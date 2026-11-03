# CN6005 Week 2 diagrams («Τυφλή αναζήτηση»).
# Run: python3 scripts/diagrams/cn6005-week2.py src/content/lessons/cn6005/images
# Everything shown is computed here: tree sizes, the DFS/BFS runs on the
# maze (move order: αριστερά, πάνω, δεξιά, κάτω, as in the lecture), and the
# Branch & Bound costs. The asserts check the numbers quoted in the lesson.
import sys
import xml.dom.minidom
from collections import deque
from html import escape
from math import factorial

OUT = sys.argv[1]
INK, MUTED, EDGE, LINE = '#0c2636', '#4a5a65', '#7b8a94', '#c9d3d9'
ACC, ACC_BG = '#841387', '#f3e6f4'          # CN6005 accent
OK, OK_BG = '#2e7d32', '#e8f5e9'
BAD, BAD_BG = '#c62828', '#fdecea'
WARN, WARN_BG = '#a15c00', '#fff1d6'
BOX = '#eef3f6'
FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif"
W = 500


def svg(h, title, body):
    defs = ''.join(
        f'<marker id="a-{n}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
        f'<path d="M0 0L10 5L0 10z" fill="{c}"/></marker>' for n, c in (('ink', INK), ('acc', ACC), ('ok', OK), ('muted', EDGE)))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {h}" width="{W}" height="{h}" font-family="{FONT}">\n'
            f'  <title>{escape(title)}</title>\n  <defs>{defs}</defs>\n  <rect width="{W}" height="{h}" fill="#ffffff"/>\n'
            + '\n'.join('  ' + b for b in body) + '\n</svg>\n')


def text(x, y, s, size=16, weight=400, fill=INK, anchor='middle'):
    # Escape <, > and & (e.g. «<Α, Β>», «B&B»), except deliberate <tspan> markup.
    s = s if '<tspan' in s else escape(s, quote=False)
    return f'<text x="{x:g}" y="{y:g}" text-anchor="{anchor}" font-size="{size}" font-weight="{weight}" fill="{fill}">{s}</text>'


def line(x1, y1, x2, y2, color=EDGE, w=2, dash=None, arrow=None):
    d = f' stroke-dasharray="{dash}"' if dash else ''
    m = f' marker-end="url(#a-{arrow})"' if arrow else ''
    return f'<line x1="{x1:g}" y1="{y1:g}" x2="{x2:g}" y2="{y2:g}" stroke="{color}" stroke-width="{w}"{d}{m}/>'


def rect(x, y, w, h, fill=BOX, stroke=EDGE, sw=2, rx=8, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ''
    return f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d}/>'


def circle(x, y, r, fill='#ffffff', stroke=EDGE, sw=2):
    return f'<circle cx="{x:g}" cy="{y:g}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'


# ---- Σχήμα: a state, its operators and its children (slide 2) ----------
def expansion():
    b = []
    px, py = 250, 50
    kids = [110, 250, 390]
    for x in kids:
        b.append(line(px, py + 26, x, 186, ACC, 2.5, arrow='acc'))
    b.append(circle(px, py, 26, ACC_BG, ACC, 3))
    b.append(text(px, py + 6, 'S', 18, 800))
    b.append(text(px + 40, py + 6, 'κατάσταση (γονέας)', 15, 700, INK, 'start'))
    for i, x in enumerate(kids):
        b.append(circle(x, 212, 24, BOX, EDGE, 2))
        b.append(text(x, 218, f'S{i + 1}', 16, 800))
    b.append(text(24, 120, 'τελεστές', 15, 700, ACC, 'start'))
    b.append(text(24, 140, 'μετάβασης', 15, 700, ACC, 'start'))
    b.append(text(W / 2, 268, 'νέες καταστάσεις (παιδιά)', 15, 700, INK))
    b.append(text(W / 2, 302, 'Επέκταση: παράγονται όλα τα παιδιά μιας κατάστασης.', 15, 400, MUTED))
    b.append(text(W / 2, 324, 'Παράγοντας διακλάδωσης: πόσα είναι (εδώ 3).', 15, 400, MUTED))
    return svg(340, 'Επέκταση μιας κατάστασης', b)


# ---- Σχήμα: the tree grows exponentially (b = 2), as on slide 3 ---------
def growth():
    b, levels = [], 5                                # depths 0..4
    x0, x1 = 196, 490
    xs = lambda d: [x0 + (i + 0.5) * ((x1 - x0) / 2 ** d) for i in range(2 ** d)]
    ys = [48, 104, 160, 216, 272]
    b.append(text(22, 22, 'd', 14, 800, MUTED, 'start'))
    b.append(text(72, 22, 'κόμβοι', 14, 800, MUTED, 'middle'))
    b.append(text(146, 22, 'σύνολο', 14, 800, MUTED, 'middle'))
    for d in range(1, levels):
        for i, x in enumerate(xs(d)):
            b.append(line(xs(d - 1)[i // 2], ys[d - 1] + 10, x, ys[d] - 9))
    for d in range(levels):
        r = [13, 12, 11, 10, 8][d]
        for x in xs(d):
            b.append(circle(x, ys[d], r, ACC_BG if d == 4 else BOX, ACC if d == 4 else EDGE, 1.8))
        b.append(text(22, ys[d] + 6, str(d), 17, 800, INK, 'start'))
        b.append(text(72, ys[d] + 6, str(2 ** d), 17, 800, ACC if d == 4 else INK))
        b.append(text(146, ys[d] + 6, str(2 ** (d + 1) - 1), 17, 700, MUTED))
    b.append(line(14, 296, 486, 296, LINE, 1.5))
    b.append(text(W / 2, 322, 'Με b = 2: στο βάθος d υπάρχουν 2ᵈ κόμβοι', 16, 400, MUTED))
    b.append(text(W / 2, 346, 'και συνολικά 2ᵈ⁺¹ − 1 μέχρι εκεί (31 στο d = 4).', 16, 400, MUTED))
    assert [2 ** (d + 1) - 1 for d in range(5)] == [1, 3, 7, 15, 31]
    assert sum(2 ** d for d in range(11)) == 2047 and 2 ** 10 == 1024
    assert sum(3 ** d for d in range(11)) == 88573 and sum(10 ** d for d in range(6)) == 111111
    return svg(362, 'Ο αριθμός των κόμβων διπλασιάζεται σε κάθε επίπεδο', b)


# ---- Σχήμα: the chessboard and the grains of rice (slide 5) --------------
def chessboard():
    b = []
    cs, x0, y0 = 56, 26, 20
    for k in range(64):
        r, c = divmod(k, 8)
        dark = (r + c) % 2 == 1
        hl = k in (39, 63)
        fill = ACC if hl else ('#2b3a44' if dark else '#eef3f6')
        b.append(f'<rect x="{x0 + c * cs}" y="{y0 + r * cs}" width="{cs}" height="{cs}" fill="{fill}"/>')
        col = '#ffffff' if dark or hl else INK
        b.append(text(x0 + c * cs + cs / 2, y0 + r * cs + cs / 2 + 7,
                      f'2<tspan dy="-8" font-size="12">{k}</tspan>', 18, 800, col))
    b.append(f'<rect x="{x0}" y="{y0}" width="{8 * cs}" height="{8 * cs}" fill="none" stroke="{INK}" stroke-width="2"/>')
    y = y0 + 8 * cs + 30
    assert 2 ** 39 == 549_755_813_888 and 2 ** 63 == 9_223_372_036_854_775_808 and 2 ** 64 - 1 == 18_446_744_073_709_551_615
    b.append(text(W / 2, y, 'Τετράγωνο k: 2ᵏ⁻¹ κόκκοι. Τονισμένα το 40ό και το 64ο.', 15, 400, MUTED))
    b.append(text(W / 2, y + 24, '40ό: 2³⁹ ≈ 5,5 · 10¹¹ · 64ο: 2⁶³ ≈ 9,2 · 10¹⁸', 15, 700, INK))
    b.append(text(W / 2, y + 48, 'Σύνολο και στα 64: 2⁶⁴ − 1 ≈ 1,8 · 10¹⁹ κόκκοι.', 15, 400, MUTED))
    return svg(y + 64, 'Η σκακιέρα με τους κόκκους ρυζιού', b)


# ---- Σχήμα: the two glasses — start and goal states (slide 10) ----------
def jug_states():
    b = []
    def glasses(x, y, big, small, qbig=False, qsmall=False):
        b.append(rect(x, y, 140, 120, '#ffffff', LINE, 1.5, 10))
        for gx, gy, gw, gh, v, cap, q, lab in ((x + 18, y + 18, 54, 70, big, 70, qbig, '70 ml'), (x + 86, y + 40, 38, 48, small, 50, qsmall, '50 ml')):
            b.append(f'<rect x="{gx}" y="{gy}" width="{gw}" height="{gh}" fill="#ffffff" stroke="{INK}" stroke-width="2"/>')
            if v:
                lv = (gh - 2) * v / cap
                b.append(f'<rect x="{gx + 1}" y="{gy + gh - lv - 1:g}" width="{gw - 2}" height="{lv:g}" fill="#2f8fdc"/>')
                b.append(text(gx + gw / 2, gy + gh - 6, f'{v}', 13, 800, '#ffffff'))
            if q:
                b.append(text(gx + gw / 2, gy + gh / 2 + 6, '?', 18, 800, MUTED))
            b.append(text(gx + gw / 2, y + 108, lab, 12, 700, MUTED))
    glasses(20, 40, 0, 0)
    b.append(text(90, 26, 'Αρχική κατάσταση', 15, 800))
    glasses(196, 40, 40, 0, qsmall=True)
    b.append(text(350, 108, 'ή', 18, 700, MUTED))
    glasses(340 + 0, 40, 0, 40, qbig=True)
    # move the second goal to the right edge
    b[-1:] = b[-1:]
    b.append(text(343, 26, 'Τελικές καταστάσεις', 15, 800))
    b.append(text(W / 2, 196, 'Γεμίζεις ένα ποτήρι μέχρι το χείλος (μόνο όταν είναι άδειο),', 14, 400, MUTED))
    b.append(text(W / 2, 218, 'το αδειάζεις στο άλλο ή στον νεροχύτη. Στόχος: ακριβώς', 14, 400, MUTED))
    b.append(text(W / 2, 240, '40 ml σε οποιοδήποτε από τα δύο. «?» = οτιδήποτε.', 14, 400, MUTED))
    return svg(256, 'Το πρόβλημα των ποτηριών: αρχική και τελικές καταστάσεις', b)


# ---- Σχήμα: where the children go — stack (DFS) vs queue (BFS) -----------
def frontier():
    b = []
    def cells(y, items, hl, x0=150):
        for i, (lab, kind) in enumerate(items):
            fill, stroke = (ACC_BG, ACC) if kind == 'new' else (BOX, EDGE)
            b.append(rect(x0 + i * 56, y, 48, 40, fill, stroke, 2.5 if kind == 'new' else 2, 6))
            b.append(text(x0 + i * 56 + 24, y + 27, lab, 18, 800))
    b.append(text(20, 30, 'Πριν: το μέτωπο είναι <Α, Β>.', 16, 700, INK, 'start'))
    b.append(text(20, 54, 'Βγαίνει το Α· τα παιδιά του είναι Γ, Δ.', 16, 400, MUTED, 'start'))
    b.append(text(20, 108, 'DFS', 20, 800, ACC, 'start'))
    b.append(text(20, 130, 'στοίβα', 14, 400, MUTED, 'start'))
    cells(90, [('Γ', 'new'), ('Δ', 'new'), ('Β', 'old')], 0)
    b.append(text(150, 152, '↑ στην αρχή: επόμενο εξετάζεται το Γ', 14, 700, ACC, 'start'))
    b.append(text(20, 210, 'BFS', 20, 800, ACC, 'start'))
    b.append(text(20, 232, 'ουρά', 14, 400, MUTED, 'start'))
    cells(192, [('Β', 'old'), ('Γ', 'new'), ('Δ', 'new')], 0)
    b.append(text(150, 254, 'στο τέλος ↑: επόμενο εξετάζεται το Β', 14, 700, ACC, 'start'))
    b.append(text(W / 2, 290, 'Μόνο αυτό αλλάζει: σε ποιο σημείο μπαίνουν τα παιδιά.', 16, 400, MUTED))
    return svg(306, 'Το μέτωπο αναζήτησης ως στοίβα και ως ουρά', b)


# ---- Σχήμα: iterative deepening — three rounds with growing depth limit --
def deepening():
    b = []
    # A small tree three levels deep (not the practice tree, whose ID order is an exercise).
    labels = ['Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ', 'Η', 'Θ', 'Ι']
    kids = {0: [1, 2], 1: [3, 4], 2: [5, 6], 4: [7], 5: [8]}
    pos = {0: (0.5, 0), 1: (0.25, 1), 2: (0.75, 1), 3: (0.1, 2), 4: (0.38, 2), 5: (0.62, 2), 6: (0.9, 2), 7: (0.38, 3), 8: (0.62, 3)}
    parent = {c: p for p, cs in kids.items() for c in cs}
    def dfs_limited(limit):
        order, stack = [], [0]
        while stack:
            n = stack.pop(0)
            order.append(n)
            if pos[n][1] < limit:
                stack = kids.get(n, []) + stack
        return order
    pw, ph, top, gap = 150, 186, 40, 44
    visits = []
    for k, limit in enumerate((1, 2, 3)):
        x0 = 20 + k * 160
        order = dfs_limited(limit)
        visits.append(len(order))
        b.append(text(x0 + pw / 2, 24, f'Όριο βάθους {limit}', 15, 800, INK))
        b.append(rect(x0, top, pw, ph, '#ffffff', LINE, 1.5, 10))
        P = {i: (x0 + 14 + fx * (pw - 28), top + 24 + fy * gap) for i, (fx, fy) in pos.items()}
        for i, p in parent.items():
            on = i in order
            b.append(line(*P[p], *P[i], ACC if on else LINE, 2.5 if on else 1.5, None if on else '4 4'))
        for i in P:
            on = i in order
            b.append(circle(*P[i], 11, ACC_BG if on else '#ffffff', ACC if on else LINE, 2))
            b.append(text(P[i][0], P[i][1] + 5, labels[i], 13, 800, INK if on else EDGE))
        ly = top + 24 + limit * gap + 20
        b.append(line(x0 + 6, ly, x0 + pw - 6, ly, BAD, 2, '6 4'))
        b.append(text(x0 + pw / 2, top + ph + 22, f'{len(order)} κόμβοι', 14, 700, MUTED))
    assert visits == [3, 7, 9]
    b.append(text(W / 2, top + ph + 56, 'Κάθε γύρος είναι ένας DFS από την αρχή, με όριο κατά 1', 15, 400, MUTED))
    b.append(text(W / 2, top + ph + 78, 'μεγαλύτερο. Κάτω από την κόκκινη γραμμή δεν κατεβαίνει.', 15, 400, MUTED))
    # the lesson's figure: b = 10, d = 5
    bfs = sum(10 ** i for i in range(6))
    ids = sum((5 + 1 - i) * 10 ** i for i in range(6))
    assert (bfs, ids) == (111111, 123456)
    return svg(top + ph + 94, 'Επαναληπτική εκβάθυνση: τρεις γύροι DFS με όριο βάθους', b)


# ---- Σχήμα: the maze, DFS vs BFS ----------------------------------------
MAZE = ["###########",
        "#.........#",
        "#.##.#.##.#",
        "S.........G",
        "#.##.#.##.#",
        "#.........#",
        "###########"]
MOVES = [(-1, 0), (0, -1), (1, 0), (0, 1)]           # αριστερά, πάνω, δεξιά, κάτω


def maze_search(bfs):
    H, Wm = len(MAZE), len(MAZE[0])
    free = lambda x, y: 0 <= x < Wm and 0 <= y < H and MAZE[y][x] != '#'
    S = next((x, y) for y in range(H) for x in range(Wm) if MAZE[y][x] == 'S')
    G = next((x, y) for y in range(H) for x in range(Wm) if MAZE[y][x] == 'G')
    F, closed, order = deque([(S, [S])]), set(), []
    while F:
        p, path = F.popleft()
        if p in closed:
            continue
        order.append(p)
        if p == G:
            return path, order
        closed.add(p)
        kids = [(k, path + [k]) for k in ((p[0] + dx, p[1] + dy) for dx, dy in MOVES) if free(*k)]
        if bfs:
            F.extend(kids)
        else:
            F.extendleft(reversed(kids))


def maze():
    b = []
    cs = 36
    free_n = sum(c != '#' for r in MAZE for c in r)
    for k, (name, bfs) in enumerate((('DFS', False), ('BFS', True))):
        path, order = maze_search(bfs)
        x0, y0 = (W - 11 * cs) / 2, 46 + k * 330
        seen = set(order)
        b.append(text(x0, y0 - 14, name, 20, 800, ACC, 'start'))
        b.append(text(x0 + 11 * cs, y0 - 14, f'διαδρομή {len(path) - 1} βήματα · εξέτασε {len(order)} θέσεις', 15, 700, MUTED, 'end'))
        for y, row in enumerate(MAZE):
            for x, c in enumerate(row):
                if c == '#':
                    fill = '#2b3a44'
                elif (x, y) in seen:
                    fill = WARN_BG
                else:
                    fill = '#ffffff'
                b.append(f'<rect x="{x0 + x * cs}" y="{y0 + y * cs}" width="{cs}" height="{cs}" fill="{fill}" stroke="{LINE}" stroke-width="1"/>')
        pts = ' '.join(f'{x0 + x * cs + cs / 2:g},{y0 + y * cs + cs / 2:g}' for x, y in path)
        b.append(f'<polyline points="{pts}" fill="none" stroke="{ACC}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>')
        for (x, y), lab in ((path[0], 'S'), (path[-1], 'G')):
            b.append(circle(x0 + x * cs + cs / 2, y0 + y * cs + cs / 2, 13, ACC, ACC, 2))
            b.append(text(x0 + x * cs + cs / 2, y0 + y * cs + cs / 2 + 6, lab, 15, 800, '#ffffff'))
        if k == 0:
            dfs_len, dfs_n = len(path) - 1, len(order)
        else:
            bfs_len, bfs_n = len(path) - 1, len(order)
    assert (dfs_len, dfs_n, bfs_len, bfs_n, free_n) == (14, 37, 10, 33, 37)
    y = 46 + 2 * 330 - 46
    b.append(rect(80, y, 18, 18, WARN_BG, LINE, 1, 3))
    b.append(text(106, y + 14, 'εξετάστηκε', 14, 400, MUTED, 'start'))
    b.append(line(210, y + 9, 250, y + 9, ACC, 5))
    b.append(text(258, y + 14, 'η διαδρομή που βρέθηκε', 14, 400, MUTED, 'start'))
    b.append(text(W / 2, y + 44, 'Σειρά κινήσεων: αριστερά, πάνω, δεξιά, κάτω.', 15, 400, MUTED))
    return svg(y + 60, 'Λαβύρινθος: τι βρίσκει ο DFS και τι ο BFS', b)


# ---- Σχήμα: bidirectional search — one deep search vs two half ones -----
def bidirectional():
    b = []
    # left: one search to depth d
    b.append(text(125, 26, 'Μία αναζήτηση', 17, 800))
    b.append(f'<path d="M125 50 L40 300 L210 300 Z" fill="{BOX}" stroke="{EDGE}" stroke-width="2"/>')
    b.append(circle(125, 50, 12, ACC, ACC)); b.append(text(125, 55, 'S', 13, 800, '#ffffff'))
    b.append(circle(170, 300, 12, OK, OK)); b.append(text(170, 305, 'G', 13, 800, '#ffffff'))
    b.append(text(125, 330, 'μέχρι το βάθος d', 15, 400, MUTED))
    b.append(text(125, 356, 'περίπου bᵈ κόμβοι', 16, 800, INK))
    # right: two searches meeting in the middle
    b.append(text(375, 26, 'Δύο αναζητήσεις', 17, 800))
    b.append(f'<path d="M375 50 L320 175 L430 175 Z" fill="{ACC_BG}" stroke="{ACC}" stroke-width="2"/>')
    b.append(f'<path d="M375 300 L320 175 L430 175 Z" fill="{OK_BG}" stroke="{OK}" stroke-width="2"/>')
    b.append(circle(375, 50, 12, ACC, ACC)); b.append(text(375, 55, 'S', 13, 800, '#ffffff'))
    b.append(circle(375, 300, 12, OK, OK)); b.append(text(375, 305, 'G', 13, 800, '#ffffff'))
    b.append(circle(375, 175, 9, '#ffffff', INK, 3))
    b.append(text(312, 168, 'κοινή', 13, 700, INK, 'end')); b.append(text(312, 184, 'κατάσταση', 13, 700, INK, 'end'))
    b.append(text(375, 330, 'καθεμία μέχρι το d/2', 15, 400, MUTED))
    b.append(text(375, 356, 'περίπου 2·b<tspan dy="-7" font-size="11">d/2</tspan><tspan dy="7"> κόμβοι</tspan>', 16, 800, INK))
    b.append(line(20, 378, 480, 378, LINE, 1.5))
    assert (10 ** 6, 2 * 10 ** 3) == (1_000_000, 2_000)
    b.append(text(W / 2, 404, 'Π.χ. με b = 10 και d = 6: περίπου 1.000.000 κόμβοι', 15, 400, MUTED))
    b.append(text(W / 2, 428, 'με μία αναζήτηση, μόλις 2.000 με δύο.', 15, 400, MUTED))
    return svg(444, 'Αναζήτηση διπλής κατεύθυνσης', b)


# ---- TSP: the graph and the Branch & Bound tree ---------------------------
CITIES = {'α': (100, 70), 'β': (400, 70), 'γ': (400, 270), 'δ': (100, 270)}
DIST = {frozenset('αβ'): 3, frozenset('αγ'): 5, frozenset('αδ'): 3, frozenset('βγ'): 5, frozenset('βδ'): 9, frozenset('γδ'): 5}
d = lambda u, v: DIST[frozenset(u + v)]


def tsp_graph():
    b = []
    for pair, w in DIST.items():
        u, v = sorted(pair)
        (x1, y1), (x2, y2) = CITIES[u], CITIES[v]
        diag = {u, v} in ({'α', 'γ'}, {'β', 'δ'})
        b.append(line(x1, y1, x2, y2, ACC if not diag and w in (3, 5) and {u, v} != {'β', 'δ'} else EDGE, 2.5))
        # weight label: on the edge, offset for the two diagonals so they don't collide
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        if diag:
            mx, my = (x1 + 3 * x2) / 4 if u == 'α' else (3 * x1 + x2) / 4, (y1 + 3 * y2) / 4 if u == 'α' else (3 * y1 + y2) / 4
        b.append(circle(mx, my, 15, '#ffffff', LINE, 1.5))
        b.append(text(mx, my + 6, str(w), 16, 800))
    for c, (x, y) in CITIES.items():
        b.append(circle(x, y, 24, ACC_BG if c == 'α' else BOX, ACC if c == 'α' else EDGE, 2.5))
        b.append(text(x, y + 7, c, 20, 800))
    b.append(text(W / 2, 330, 'Αφετηρία η α. Τονισμένη η βέλτιστη διαδρομή', 15, 400, MUTED))
    b.append(text(W / 2, 352, 'α → β → γ → δ → α: 3 + 5 + 5 + 3 = 16.', 15, 400, MUTED))
    return svg(368, 'Ο πλανόδιος πωλητής με 4 πόλεις', b)


def bnb_tree():
    # Depth-first over all tours from α, children in the order β, γ, δ; prune a
    # partial tour as soon as its cost exceeds the best complete tour so far.
    rows, best = [], float('inf')
    def visit(path, cost):
        nonlocal best
        rest = [c for c in 'βγδ' if c not in path]
        if not rest:
            total = cost + d(path[-1], 'α')
            rows.append((path + ['α'], total, 'new' if total < best else 'equal'))
            best = min(best, total)
            return
        for c in rest:
            nc = cost + d(path[-1], c)
            if nc > best:
                rows.append((path + [c], nc, 'pruned'))
            else:
                visit(path + [c], nc)
    visit(['α'], 0)
    assert [(''.join(p), c, s) for p, c, s in rows] == [
        ('αβγδα', 16, 'new'), ('αβδγ', 17, 'pruned'), ('αγβδ', 19, 'pruned'),
        ('αγδβ', 19, 'pruned'), ('αδβγ', 17, 'pruned'), ('αδγβα', 16, 'equal')]
    b = []
    b.append(text(20, 28, 'Σειρά', 14, 700, MUTED, 'start'))
    b.append(text(70, 28, 'Διαδρομή (κόστος μέχρι εκεί)', 14, 700, MUTED, 'start'))
    b.append(text(480, 28, 'Όριο', 14, 700, MUTED, 'end'))
    bound = '∞'
    for i, (path, cost, state) in enumerate(rows):
        y = 44 + i * 58
        fill, stroke = {'new': (OK_BG, OK), 'equal': (BOX, EDGE), 'pruned': (BAD_BG, BAD)}[state]
        b.append(rect(14, y, 472, 46, fill, stroke, 2, 8, '6 4' if state == 'pruned' else None))
        b.append(text(34, y + 29, f'{i + 1}', 16, 800, MUTED))
        # the path with running costs
        x, run = 62, 0
        for j, c in enumerate(path):
            if j:
                run += d(path[j - 1], c)
                b.append(text(x + 2, y + 29, '→', 15, 400, MUTED, 'start'))
                x += 20
            b.append(text(x, y + 30, c, 18, 800, INK, 'start'))
            x += 16
        b.append(text(262, y + 30, f'= {cost}', 17, 800, stroke, 'start'))
        note = {'new': 'λύση · νέο όριο', 'equal': 'λύση, όχι καλύτερη', 'pruned': 'κλάδεμα'}[state]
        b.append(text(318, y + 30, note, 13, 700, stroke, 'start'))
        if state == 'new':
            bound = str(cost)
        b.append(text(476, y + 30, bound, 16, 800, INK, 'end'))
    y = 44 + len(rows) * 58 + 10
    b.append(text(W / 2, y + 8, 'Μόλις βρεθεί λύση 16, τέσσερις διαδρομές σταματούν', 15, 400, MUTED))
    b.append(text(W / 2, y + 30, 'πριν ολοκληρωθούν: το κόστος τους ήδη ξεπερνά το 16.', 15, 400, MUTED))
    assert factorial(19) > 1.2e17
    return svg(y + 46, 'Branch & Bound στον πλανόδιο πωλητή', b)


# ---- The practice tree (replaces the ASCII drawing) ----------------------
def practice():
    b = []
    P = {'A': (250, 40), 'B': (140, 120), 'C': (360, 120), 'D': (85, 200), 'E': (195, 200),
         'F': (315, 200), 'G': (405, 200), 'H': (150, 280), 'I': (240, 280), 'J': (315, 280)}
    parent = {'B': 'A', 'C': 'A', 'D': 'B', 'E': 'B', 'F': 'C', 'G': 'C', 'H': 'E', 'I': 'E', 'J': 'F'}
    for c, p in parent.items():
        b.append(line(*P[p], *P[c], EDGE, 2))
    for n, (x, y) in P.items():
        goal = n in 'IJ'
        b.append(circle(x, y, 22, OK_BG if goal else BOX, OK if goal else EDGE, 3 if goal else 2))
        if goal:
            b.append(circle(x, y, 16, 'none', OK, 1.5))
        b.append(text(x, y + 7, n, 19, 800))
    b.append(text(W / 2, 336, 'Τελικές καταστάσεις: I και J (διπλός κύκλος).', 15, 400, MUTED))
    b.append(text(W / 2, 358, 'Πολλά παιδιά: πρώτα το αριστερό.', 15, 400, MUTED))
    return svg(374, 'Δένδρο εξάσκησης', b)


for name, fn in (('search-expansion', expansion), ('search-growth', growth), ('chessboard-rice', chessboard), ('jug-states', jug_states), ('frontier-stack-queue', frontier), ('iterative-deepening', deepening),
                 ('maze-dfs-bfs', maze), ('bidirectional-search', bidirectional), ('tsp-graph', tsp_graph),
                 ('tsp-branch-and-bound', bnb_tree), ('practice-tree', practice)):
    out = fn()
    xml.dom.minidom.parseString(out)   # an <img> shows nothing for invalid XML
    open(f'{OUT}/{name}.svg', 'w').write(out)
print('ok')
