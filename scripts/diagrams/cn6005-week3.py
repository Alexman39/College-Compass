# CN6005 Week 3 diagrams («Ευριστική αναζήτηση»).
# Run: python3 scripts/diagrams/cn6005-week3.py src/content/lessons/cn6005/images
# Everything shown is computed here: the distances, the puzzle heuristics
# (counting the blank, as the lecture does), the maze runs of Greedy BestFS
# and Hill Climbing (move order: αριστερά, πάνω, δεξιά, κάτω), the 8-puzzle
# tree of slide 18 and the two exercise trees. The asserts check the numbers
# quoted in the lesson.
import sys
import xml.dom.minidom
from html import escape
from math import sqrt

OUT = sys.argv[1]
INK, MUTED, EDGE, LINE = '#0c2636', '#4a5a65', '#7b8a94', '#c9d3d9'
ACC, ACC_BG = '#841387', '#f3e6f4'          # CN6005 accent
OK, OK_BG = '#2e7d32', '#e8f5e9'
BAD, BAD_BG = '#c62828', '#fdecea'
WARN, WARN_BG = '#a15c00', '#fff1d6'
BOX = '#eef3f6'
WALL = '#2b3a44'
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


# ---- Σχήμα: Euclidean and Manhattan distance (slide 6) --------------------
def distances():
    b = []
    S, F = (5, 4), (15, 10)
    euclid = sqrt((S[0] - F[0]) ** 2 + (S[1] - F[1]) ** 2)
    manhattan = abs(S[0] - F[0]) + abs(S[1] - F[1])
    assert round(euclid, 2) == 11.66 and manhattan == 16
    cs, x0, y0 = 26, 52, 24
    X = lambda x: x0 + (x - 0.5) * cs
    Y = lambda y: y0 + (15 - y + 0.5) * cs
    for x in range(1, 16):
        for y in range(1, 16):
            b.append(f'<rect x="{x0 + (x - 1) * cs}" y="{y0 + (15 - y) * cs}" width="{cs}" height="{cs}" fill="#ffffff" stroke="{LINE}" stroke-width="1"/>')
    for k in range(1, 16, 2):
        b.append(text(X(k), y0 + 15 * cs + 18, str(k), 12, 700, MUTED))
        b.append(text(x0 - 10, Y(k) + 4, str(k), 12, 700, MUTED, 'end'))
    # Manhattan: right along y = 4, then up along x = 15
    b.append(f'<polyline points="{X(S[0]):g},{Y(S[1]):g} {X(F[0]):g},{Y(S[1]):g} {X(F[0]):g},{Y(F[1]):g}" fill="none" stroke="{OK}" stroke-width="4" stroke-dasharray="9 6"/>')
    b.append(line(X(S[0]), Y(S[1]), X(F[0]), Y(F[1]), ACC, 4))
    for (x, y), lab in ((S, 'S'), (F, 'F')):
        b.append(circle(X(x), Y(y), 12, INK, INK))
        b.append(text(X(x), Y(y) + 5, lab, 14, 800, '#ffffff'))
    b.append(text(X(10) - 8, Y(7.6), 'd ≈ 11,66', 15, 800, ACC, 'end'))
    b.append(text(X(10), Y(4) + 26, '10', 14, 700, OK))
    b.append(text(X(15) + 12, Y(7) + 5, '6', 14, 700, OK, 'start'))
    y = y0 + 15 * cs + 48
    b.append(text(W / 2, y, 'S = (5, 4), F = (15, 10)', 15, 700, INK))
    b.append(line(70, y + 22, 104, y + 22, ACC, 4))
    b.append(text(112, y + 27, 'Ευκλείδεια: √(10² + 6²) = √136 ≈ 11,66', 14, 400, MUTED, 'start'))
    b.append(line(70, y + 46, 104, y + 46, OK, 4, '9 6'))
    b.append(text(112, y + 51, 'Manhattan: 10 + 6 = 16 βήματα', 14, 400, MUTED, 'start'))
    return svg(y + 68, 'Ευκλείδεια απόσταση και απόσταση Manhattan', b)


# ---- puzzles ------------------------------------------------------------------
def puzzle_h(state, n):
    """Misplaced tiles and Manhattan sum, counting the blank (0) like the lecture."""
    out, man = 0, 0
    for i, t in enumerate(state):
        goal = (t - 1) if t else n * n - 1
        if i != goal:
            out += 1
        man += abs(i // n - goal // n) + abs(i % n - goal % n)
    return out, man


def board(b, x, y, state, n, cs, hl=None, blank=WALL, fs=None):
    fs = fs or int(cs * 0.55)
    for i, t in enumerate(state):
        cx, cy = x + (i % n) * cs, y + (i // n) * cs
        fill = blank if t == 0 else (hl(i, t) if hl else '#ffffff')
        b.append(f'<rect x="{cx:g}" y="{cy:g}" width="{cs}" height="{cs}" fill="{fill}" stroke="{INK}" stroke-width="1.5"/>')
        if t:
            b.append(text(cx + cs / 2, cy + cs / 2 + fs * 0.36, str(t), fs, 700))


# ---- Σχήμα: the 15-puzzle heuristics (slides 7 and 9) ---------------------
P15 = [7, 14, 3, 6, 8, 10, 2, 12, 9, 1, 5, 11, 13, 0, 15, 4]


def puzzle15():
    b = []
    n, cs = 4, 50
    assert puzzle_h(P15, 4) == (12, 28)
    tiles_only = sum(1 for i, t in enumerate(P15) if t and i != t - 1)
    man_tiles = sum(abs(i // 4 - (t - 1) // 4) + abs(i % 4 - (t - 1) % 4) for i, t in enumerate(P15) if t)
    assert (tiles_only, man_tiles) == (11, 26)
    dist = lambda i, t: (lambda g: abs(i // n - g // n) + abs(i % n - g % n))((t - 1) if t else n * n - 1)
    x0, y0 = 40, 56
    b.append(text(x0 + 2 * cs, 30, 'Κατάσταση', 16, 800))
    board(b, x0, y0, P15, n, cs, hl=lambda i, t: WARN_BG if dist(i, t) else '#ffffff', blank=WARN_BG)
    for i, t in enumerate(P15):
        d = dist(i, t)
        cx, cy = x0 + (i % n) * cs, y0 + (i // n) * cs
        if t == 0:
            b.append(text(cx + cs / 2, cy + cs / 2 + 6, '·', 22, 800, WARN))
        b.append(text(cx + cs - 6, cy + 15, str(d), 12, 800, ACC if d else MUTED, 'end'))
    gx = 310
    b.append(text(gx + 1.5 * 38, 30, 'Τελική', 16, 800))
    board(b, gx, y0, list(range(1, 16)) + [0], n, 38, fs=17)
    y = y0 + n * cs + 36
    b.append(rect(40, y - 14, 18, 18, WARN_BG, LINE, 1, 3))
    b.append(text(66, y, 'εκτός θέσης · μωβ αριθμός: απόσταση Manhattan', 14, 400, MUTED, 'start'))
    b.append(text(W / 2, y + 32, 'Εκτός θέσης = 12 · Άθροισμα Manhattan = 28', 17, 800, INK))
    b.append(text(W / 2, y + 56, 'Μετράει και το κενό (·): 1 εκτός θέσης, απόσταση 2.', 14, 400, MUTED))
    b.append(text(W / 2, y + 78, 'Χωρίς το κενό: 11 και 26.', 14, 400, MUTED))
    return svg(y + 96, 'Ευριστικές τιμές στο 15-puzzle', b)


# ---- The maze of slide 14 -----------------------------------------------------
MW, MH = 10, 6
WALLS = {(x, y) for y, xs in {6: [4, 9, 10], 5: [2, 6], 4: [1, 2, 3, 4, 8], 3: [4, 5, 8], 2: [2, 7, 8, 10], 1: [2, 6]}.items() for x in xs}
MS, MF = (5, 5), (9, 3)
MOVES = [(-1, 0), (0, 1), (1, 0), (0, -1)]     # αριστερά, πάνω, δεξιά, κάτω
mh = lambda p: abs(p[0] - MF[0]) + abs(p[1] - MF[1])


def neighbours(p):
    for dx, dy in MOVES:
        q = (p[0] + dx, p[1] + dy)
        if 1 <= q[0] <= MW and 1 <= q[1] <= MH and q not in WALLS:
            yield q


def greedy_maze():
    """Lecture slides 11–12: Next ∪ Frontier, sorted by h (stable), closed set checked when taken."""
    frontier, closed, parent = [MS], [], {MS: None}
    while frontier:
        c = frontier.pop(0)
        if c in closed:
            continue
        if c == MF:
            path = [c]
            while parent[path[-1]]:
                path.append(parent[path[-1]])
            return path[::-1], closed
        kids = list(neighbours(c))
        for k in kids:
            if k not in closed and k not in parent:
                parent[k] = c
        frontier = sorted(kids + frontier, key=mh)
        closed.append(c)


def hc_maze():
    """Hill Climbing (slides 19–20): move to the child with the smallest h, with
    no frontier. The lecture's loop never ends here, so stop on a repeat."""
    path = [MS]
    while path[-1] != MF:
        best = min(neighbours(path[-1]), key=mh)    # min keeps the first on ties
        if best in path:
            return path, best
        path.append(best)
    return path, None


def beam_maze(n=2):
    """Beam Search (slides 22–23): Greedy BestFS without closed children, keeping the best n."""
    frontier, closed = [MS], []
    while frontier:
        c = frontier.pop(0)
        if c == MF:
            return closed, True
        if c in closed:
            continue
        kids = [k for k in neighbours(c) if k not in closed]
        closed.append(c)
        frontier = sorted(kids + frontier, key=mh)[:n]
    return closed, False


def maze_grid(b, x0, y0, cs, fill_of, labels=True):
    for y in range(1, MH + 1):
        for x in range(1, MW + 1):
            p = (x, y)
            px, py = x0 + (x - 1) * cs, y0 + (MH - y) * cs
            b.append(f'<rect x="{px}" y="{py}" width="{cs}" height="{cs}" fill="{WALL if p in WALLS else fill_of(p)}" stroke="{LINE}" stroke-width="1"/>')
            if labels and p not in WALLS and p not in (MS, MF):
                b.append(text(px + cs / 2, py + cs / 2 + 5, str(mh(p)), 14, 700, MUTED))
    for k in range(1, MW + 1):
        b.append(text(x0 + (k - 0.5) * cs, y0 + MH * cs + 17, str(k), 12, 700, MUTED))
    for k in range(1, MH + 1):
        b.append(text(x0 - 8, y0 + (MH - k + 0.5) * cs + 4, str(k), 12, 700, MUTED, 'end'))


def mark(b, x0, y0, cs, p, lab):
    cx, cy = x0 + (p[0] - 0.5) * cs, y0 + (MH - p[1] + 0.5) * cs
    b.append(circle(cx, cy, cs * 0.34, ACC, ACC))
    b.append(text(cx, cy + 5, lab, 14, 800, '#ffffff'))


def poly(b, x0, y0, cs, path, color, dash=None):
    pts = ' '.join(f'{x0 + (x - 0.5) * cs:g},{y0 + (MH - y + 0.5) * cs:g}' for x, y in path)
    d = f' stroke-dasharray="{dash}"' if dash else ''
    b.append(f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" opacity="0.5"{d}/>')


# ---- Σχήμα: the maze with the Manhattan value of every free cell ---------
def maze_heuristic():
    b = []
    cs, x0, y0 = 44, 30, 20
    maze_grid(b, x0, y0, cs, lambda p: '#ffffff')
    mark(b, x0, y0, cs, MS, 'S')
    mark(b, x0, y0, cs, MF, 'F')
    assert mh(MS) == 6 and mh((6, 2)) == 4 and mh((5, 4)) == 5
    y = y0 + MH * cs + 46
    b.append(text(W / 2, y, 'S = (5, 5), F = (9, 3). Σε κάθε ελεύθερο τετράγωνο:', 15, 400, MUTED))
    b.append(text(W / 2, y + 22, 'η απόσταση Manhattan ως το F (μαύρα: τοίχοι).', 15, 400, MUTED))
    return svg(y + 40, 'Ο λαβύρινθος της διάλεξης με τις ευριστικές τιμές', b)


# ---- Σχήμα: Greedy BestFS and Hill Climbing on the maze ------------------
def maze_runs():
    b = []
    cs, x0 = 40, 50
    gpath, gclosed = greedy_maze()
    hpath, back = hc_maze()
    bclosed, bok = beam_maze()
    assert [f'{x}-{y}' for x, y in gclosed] == ['5-5', '5-4', '6-4', '7-4', '7-3', '6-3', '6-2', '7-5', '8-5', '9-5', '9-4']
    assert len(gpath) - 1 == 8
    assert [f'{x}-{y}' for x, y in hpath] == ['5-5', '5-4', '6-4', '7-4', '7-3', '6-3'] and back == (7, 3)
    assert not bok and (7, 5) not in bclosed and len(bclosed) == 18
    panels = (
        ('Greedy BestFS', f'βρίσκει το F · διαδρομή {len(gpath) - 1} βήματα · επέκτεινε {len(gclosed)} θέσεις', gpath, set(gclosed), ACC),
        ('Hill Climbing', 'από το <6,3> ξαναγυρνά στο <7,3> (h = 2): πηγαινοέρχεται, δεν φτάνει ποτέ', hpath + [back], set(hpath), BAD),
        ('Beam Search, N = 2', f'πετάει το <7,5> · χάνεται αριστερά · επέκτεινε {len(bclosed)}, δεν βρίσκει το F', None, set(bclosed), WARN))
    for k, (title, note, path, seen, color) in enumerate(panels):
        y0 = 66 + k * 330
        b.append(text(x0 - 30, y0 - 36, title, 19, 800, color, 'start'))
        b.append(text(x0 - 30, y0 - 14, note, 13, 700, MUTED, 'start'))
        maze_grid(b, x0, y0, cs, lambda p, s=seen: WARN_BG if p in s else '#ffffff')
        if path:
            poly(b, x0, y0, cs, path, color)
        mark(b, x0, y0, cs, MS, 'S')
        mark(b, x0, y0, cs, MF, 'F')
        if k == 1:
            for end in (hpath[-1], back):
                cx, cy = x0 + (end[0] - 0.5) * cs, y0 + (MH - end[1] + 0.5) * cs
                b.append(circle(cx, cy, cs * 0.4, 'none', BAD, 3))
    y = 66 + 3 * 330 - 44
    b.append(rect(60, y - 14, 18, 18, WARN_BG, LINE, 1, 3))
    b.append(text(86, y, 'επεκτάθηκε', 14, 400, MUTED, 'start'))
    b.append(line(200, y - 5, 240, y - 5, ACC, 5))
    b.append(text(248, y, 'διαδρομή · αριθμοί: h (Manhattan)', 14, 400, MUTED, 'start'))
    b.append(text(W / 2, y + 28, 'Σειρά κινήσεων: αριστερά, πάνω, δεξιά, κάτω.', 14, 400, MUTED))
    return svg(y + 44, 'Greedy BestFS, Hill Climbing και Beam Search στον λαβύρινθο', b)


# ---- Σχήμα: Greedy BestFS on the 8-puzzle (slide 18) ----------------------
def move(state, d):
    i = state.index(0)
    r, c = divmod(i, 3)
    dr, dc = {'u': (-1, 0), 'd': (1, 0), 'l': (0, -1), 'r': (0, 1)}[d]
    j = (r + dr) * 3 + c + dc
    s = list(state)
    s[i], s[j] = s[j], s[i]
    return s


def puzzle8():
    b = []
    root = [0, 1, 3, 4, 2, 5, 7, 8, 6]
    h8 = lambda s: puzzle_h(s, 3)[0]
    # (path of moves of the blank, x, y): the tree of slide 18
    T = [('', 250, 40), ('d', 120, 140), ('r', 330, 140), ('rd', 220, 240), ('rr', 430, 240),
         ('rdl', 90, 340), ('rdd', 220, 340), ('rdr', 350, 340), ('rdrd', 300, 440), ('rdru', 410, 440)]
    st = {}
    for p, _, _ in T:
        s = root
        for m in p:
            s = move(s, m)
        st[p] = s
    assert [h8(st[p]) for p, _, _ in T] == [5, 6, 4, 3, 5, 4, 4, 2, 0, 3]
    assert st['rdrd'] == [1, 2, 3, 4, 5, 6, 7, 8, 0]
    cs = 20
    pos = {p: (x, y) for p, x, y in T}
    chosen = {'r', 'rd', 'rdr', 'rdrd'}
    for p, x, y in T[1:]:
        px, py = pos[p[:-1]]
        on = p in chosen
        b.append(line(px, py + 32, x, y - 32, ACC if on else EDGE, 3.5 if on else 1.8))
        b.append(text((px + x) / 2 + (-10 if x < px else 10), (py + y) / 2 + 2, p[-1], 15, 800, BAD))
    for p, x, y in T:
        goal = p == 'rdrd'
        board(b, x - 1.5 * cs, y - 1.5 * cs, st[p], 3, cs, blank=WALL, fs=12)
        if goal:
            b.append(rect(x - 1.5 * cs - 4, y - 1.5 * cs - 4, 3 * cs + 8, 3 * cs + 8, 'none', OK, 3, 4))
        if p:
            b.append(text(x + 1.5 * cs + 8, y + 6, str(h8(st[p])), 17, 800, ACC, 'start'))
    b.append(text(250 + 1.5 * cs + 10, 46, 'αρχική', 13, 700, MUTED, 'start'))
    b.append(text(300, 440 + 1.5 * cs + 22, 'τελική', 13, 800, OK))
    y = 512
    b.append(text(W / 2, y, 'u, d, l, r: το κενό πάει πάνω, κάτω, αριστερά, δεξιά.', 14, 400, MUTED))
    b.append(text(W / 2, y + 22, 'h = πλακίδια εκτός θέσης (μαζί με το κενό).', 14, 400, MUTED))
    b.append(text(W / 2, y + 44, 'Κάθε φορά επεκτείνεται η κατάσταση με τη μικρότερη h.', 14, 400, MUTED))
    return svg(y + 60, 'Greedy BestFS στο 8-puzzle', b)


# ---- Σχήμα: the three traps of Hill Climbing (book, Σχήμα 4.6) ------------
def hc_problems():
    b = []
    panels = [
        ('Πρόποδες (foothill)', 'μια χαμηλή κορυφή «ξεγελά»',
         'M10 150 C40 150 50 70 80 70 C105 70 110 130 125 130 C140 130 150 20 175 20 C195 20 205 150 230 150', (80, 70)),
        ('Οροπέδιο (plateau)', 'όλα γύρω έχουν το ίδιο ύψος',
         'M10 150 C30 150 40 90 70 90 L170 90 C195 90 200 40 210 40 C220 40 225 150 230 150', (110, 90)),
        ('Κορυφογραμμή (ridge)', 'κάθε βήμα ανεβαίνει λίγο, μετά κατεβαίνει',
         'M10 150 L40 100 L55 120 L75 80 L90 100 L110 60 L125 80 L145 40 L160 60 L180 22 L230 150', (75, 80)),
    ]
    for k, (title, note, d, (mx, my)) in enumerate(panels):
        ox, oy = 10 + (k % 2) * 245, 20 + (k // 2) * 240
        if k == 2:
            ox = 132
        b.append(text(ox + 120, oy + 8, title, 16, 800))
        b.append(f'<g transform="translate({ox},{oy + 20})"><path d="{d} L230 160 L10 160 Z" fill="{BOX}" stroke="{EDGE}" stroke-width="2"/>'
                 f'{circle(mx, my - 9, 8, BAD, BAD)}</g>')
        b.append(text(ox + 120, oy + 204, note, 13, 400, MUTED))
    y = 490
    b.append(circle(140, y - 5, 7, BAD, BAD))
    b.append(text(154, y, 'εδώ σταματά ο Hill Climbing', 14, 400, MUTED, 'start'))
    return svg(y + 20, 'Τα τρία προβλήματα του Hill Climbing', b)


# ---- exercise trees (slides 24 and 25) ----------------------------------------
def tree(b, nodes, edges, r=20):
    for p, c in edges:
        (x1, y1), (x2, y2) = nodes[p][:2], nodes[c][:2]
        dx, dy = x2 - x1, y2 - y1
        L = (dx * dx + dy * dy) ** 0.5
        b.append(line(x1 + dx / L * r, y1 + dy / L * r, x2 - dx / L * (r + 3), y2 - dy / L * (r + 3), EDGE, 2, arrow='muted'))
    for n, (x, y, hv, lab, side) in nodes.items():
        goal = hv == 0
        b.append(circle(x, y, r, OK_BG if goal else BOX, OK if goal else EDGE, 3 if goal else 2))
        b.append(text(x, y + 6, lab, 17, 800))
        tx = x + (r + 6) * (1 if side == 'r' else -1)
        b.append(text(tx, y + 6, f'[{hv}]', 15, 700, OK if goal else ACC, 'start' if side == 'r' else 'end'))


def run_tree(nodes, edges, root):
    kids = lambda n: [c for p, c in edges if p == n]
    hv = lambda n: nodes[n][2]
    # Hill Climbing (lecture): move to the best child; stop at a goal or a dead end.
    hc, cur = [root], root
    while hv(cur) != 0 and kids(cur):
        cur = min(kids(cur), key=hv)
        hc.append(cur)
    # Greedy BestFS: Next ∪ Frontier, stable sort by h.
    gr, frontier = [], [root]
    while frontier:
        n = frontier.pop(0)
        gr.append(n)
        if hv(n) == 0:
            break
        frontier = sorted(kids(n) + frontier, key=hv)
    return hc, gr


EX1 = {'a': (250, 40, 10, 'a', 'r'), 'b': (110, 120, 10, 'b', 'l'), 'c': (250, 120, 6, 'c', 'r'), 'd': (390, 120, 8, 'd', 'r'),
       'e': (60, 210, 12, 'e', 'l'), 'f': (160, 210, 4, 'f', 'r'), 'i': (160, 300, 0, 'i', 'r'),
       'g': (340, 210, 6, 'g', 'r'), 'h': (440, 210, 10, 'h', 'r'), 'j': (340, 300, 9, 'j', 'r'), 'k': (340, 390, 0, 'k', 'r')}
EX1_E = [('a', 'b'), ('a', 'c'), ('a', 'd'), ('b', 'e'), ('b', 'f'), ('f', 'i'), ('d', 'g'), ('d', 'h'), ('g', 'j'), ('j', 'k')]

EX2 = {'c': (250, 36, 10, 'c', 'r'), 'b': (90, 116, 7, 'b', 'l'), 'd': (250, 116, 4, 'd', 'r'), 'i1': (400, 116, 3, 'i', 'r'),
       'k': (50, 200, 5, 'k', 'l'), 'i2': (140, 200, 9, 'i', 'r'), 'a': (250, 200, 12, 'a', 'r'),
       'g': (360, 200, 5, 'g', 'l'), 'h': (450, 200, 10, 'h', 'l'),
       'o': (50, 284, 7, 'o', 'r'), 'e': (140, 284, 0, 'e', 'r'), 'l': (250, 284, 0, 'l', 'r'),
       'm': (330, 284, 11, 'm', 'r'), 'f': (440, 284, 3, 'f', 'r'),
       'p': (50, 368, 0, 'p', 'r'), 'q': (290, 368, 2, 'q', 'l'), 'r': (370, 368, 0, 'r', 'l'), 'n': (440, 368, 1, 'n', 'r')}
EX2_E = [('c', 'b'), ('c', 'd'), ('c', 'i1'), ('b', 'k'), ('b', 'i2'), ('k', 'o'), ('o', 'p'), ('i2', 'e'), ('d', 'a'), ('a', 'l'),
         ('i1', 'g'), ('i1', 'h'), ('g', 'm'), ('g', 'f'), ('m', 'q'), ('m', 'r'), ('f', 'n')]


def exercise(nodes, edges, root, title, height):
    b = []
    tree(b, nodes, edges)
    b.append(text(W / 2, height - 14, 'Σε αγκύλες η ευριστική τιμή. Με τιμή [0]: τερματικοί κόμβοι.', 14, 400, MUTED))
    return svg(height, title, b)


def exercise1():
    hc, gr = run_tree(EX1, EX1_E, 'a')
    assert hc == ['a', 'c'] and gr == ['a', 'c', 'd', 'g', 'j', 'k']
    return exercise(EX1, EX1_E, 'a', 'Άσκηση 1: δένδρο αναζήτησης', 440)


def exercise2():
    hc, gr = run_tree(EX2, EX2_E, 'c')
    assert hc == ['c', 'i1', 'g', 'f', 'n'] and gr == ['c', 'i1', 'd', 'g', 'f', 'n', 'b', 'k', 'o', 'p']
    return exercise(EX2, EX2_E, 'c', 'Άσκηση 2: δένδρο αναζήτησης', 440)


# ---- Σχήμα: the idea of A* (slide 26) ---------------------------------------
def astar_idea():
    b = []
    b.append(f'<path d="M250 30 L40 330 L460 330 Z" fill="{BOX}" stroke="{EDGE}" stroke-width="2"/>')
    pts = [(250, 30), (236, 80), (258, 120), (230, 160), (246, 200)]
    b.append(f'<polyline points="{" ".join(f"{x},{y}" for x, y in pts)}" fill="none" stroke="{ACC}" stroke-width="4" stroke-linejoin="round"/>')
    b.append(line(246, 200, 312, 318, OK, 4, '9 6'))
    for (x, y), lab, col in (((250, 30), 'IS', INK), ((246, 200), 'S', ACC), ((312, 322), 'FS', OK)):
        b.append(circle(x, y, 17, col, col))
        b.append(text(x, y + 5, lab, 13, 800, '#ffffff'))
    b.append(text(222, 124, 'g(S)', 18, 800, ACC, 'end'))
    b.append(text(222, 146, 'πραγματικό κόστος', 13, 700, MUTED, 'end'))
    b.append(text(292, 254, 'h(S)', 18, 800, OK, 'start'))
    b.append(text(292, 276, 'εκτίμηση', 13, 700, MUTED, 'start'))
    b.append(text(W / 2, 366, 'f(S) = g(S) + h(S)', 19, 800, INK))
    b.append(text(W / 2, 392, 'εκτίμηση του κόστους της καλύτερης λύσης που περνά από την S', 14, 400, MUTED))
    return svg(410, 'Η ιδέα του A*', b)


# ---- Σχήμα: the small road example (ours) --------------------------------------
ROADS = {('S', 'A'): 2, ('S', 'B'): 4, ('A', 'C'): 5, ('B', 'C'): 1, ('B', 'D'): 5, ('C', 'G'): 3, ('D', 'G'): 1}
RH = {'S': 6, 'A': 3, 'B': 4, 'C': 3, 'D': 1, 'G': 0}


def roads():
    b = []
    P = {'S': (60, 150), 'A': (190, 60), 'B': (190, 240), 'C': (320, 150), 'D': (320, 300), 'G': (440, 220)}
    best = {('S', 'B'), ('B', 'C'), ('C', 'G')}
    for (u, v), c in ROADS.items():
        (x1, y1), (x2, y2) = P[u], P[v]
        on = (u, v) in best
        b.append(line(x1, y1, x2, y2, ACC if on else EDGE, 4 if on else 2))
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        b.append(circle(mx, my, 12, '#ffffff', LINE, 1))
        b.append(text(mx, my + 5, str(c), 14, 800, ACC if on else INK))
    for n, (x, y) in P.items():
        goal = n == 'G'
        b.append(circle(x, y, 22, OK_BG if goal else BOX, OK if goal else EDGE, 3 if goal else 2))
        b.append(text(x, y + 6, n, 18, 800))
        b.append(text(x, y - 30, f'h = {RH[n]}', 14, 700, MUTED))
    assert sum(ROADS[e] for e in best) == 8
    b.append(text(W / 2, 352, 'Αριθμοί στους δρόμους: κόστος. Πάνω από κάθε κόμβο: h.', 14, 400, MUTED))
    b.append(text(W / 2, 374, 'Τονισμένη η φθηνότερη διαδρομή S → B → C → G, κόστος 8.', 14, 400, MUTED))
    return svg(392, 'Ένα μικρό οδικό δίκτυο από το S στο G', b)


for name, fn in (('heuristic-distances', distances), ('puzzle15-heuristics', puzzle15), ('maze-heuristic', maze_heuristic),
                 ('maze-heuristic-runs', maze_runs), ('puzzle8-greedy', puzzle8), ('hc-problems', hc_problems),
                 ('heuristic-exercise-1', exercise1), ('heuristic-exercise-2', exercise2),
                 ('astar-idea', astar_idea), ('astar-roads', roads)):
    out = fn()
    xml.dom.minidom.parseString(out)   # an <img> shows nothing for invalid XML
    open(f'{OUT}/{name}.svg', 'w').write(out)
print('ok')
