# CN6003 Week 5 diagrams («Δικτυακές εντολές και εισαγωγή στο UNIX»).
# Run: python3 scripts/diagrams/cn6003-week5.py src/content/lessons/cn6003/images
# Positions are computed from the content; the permission bits are computed
# from the octal number, and the asserts check the values quoted in the lesson.
import sys
import xml.dom.minidom
from html import escape

OUT = sys.argv[1]
INK, MUTED, EDGE, LINE = '#0c2636', '#4a5a65', '#7b8a94', '#c9d3d9'
ACC, ACC_BG = '#841387', '#f3e6f4'
OK, OK_BG = '#2e7d32', '#e8f5e9'
BAD, BAD_BG = '#c62828', '#fdecea'
BOX_BG = '#eef3f6'
TERM = '#0d1117'
FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif"
MONO = "ui-monospace, Menlo, Consolas, monospace"
W = 500


def svg(h, title, body):
    defs = ''.join(
        f'<marker id="a-{n}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
        f'<path d="M0 0L10 5L0 10z" fill="{c}"/></marker>' for n, c in (('ink', INK), ('ok', OK), ('bad', BAD), ('acc', ACC), ('muted', EDGE)))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {h}" width="{W}" height="{h}" font-family="{FONT}">\n'
            f'  <title>{escape(title)}</title>\n  <defs>{defs}</defs>\n  <rect width="{W}" height="{h}" fill="#ffffff"/>\n'
            + '\n'.join('  ' + b for b in body) + '\n</svg>\n')


def text(x, y, s, size=16, weight=400, fill=INK, anchor='middle', mono=False):
    f = f' font-family="{MONO}"' if mono else ''
    return f'<text x="{x:g}" y="{y:g}" text-anchor="{anchor}" font-size="{size}" font-weight="{weight}" fill="{fill}"{f}>{escape(s, quote=False)}</text>'


def box(x, y, w, h, fill=BOX_BG, stroke=EDGE, sw=2, rx=10):
    return f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'


def arrow(x1, y1, x2, y2, color=INK, name='ink', w=2.5):
    return f'<line x1="{x1:g}" y1="{y1:g}" x2="{x2:g}" y2="{y2:g}" stroke="{color}" stroke-width="{w}" marker-end="url(#a-{name})"/>'


# ---- Σχήμα: the layers of a UNIX system (slides 4–7) -------------------------
def layers():
    b = []
    rows = [
        ('Χρήστης', 'πληκτρολογεί εντολές: ls, cp, chmod …', '#ffffff', EDGE, 'user mode'),
        ('Φλοιός (shell)', 'περιμένει → δέχεται → μεταφράζει → εκτελεί', ACC_BG, ACC, 'user mode'),
        ('Πυρήνας (kernel)', 'διεργασίες, μνήμη, αρχεία, συσκευές', '#dfe8ee', INK, 'kernel mode'),
        ('Υλικό', 'CPU, RAM, δίσκοι, κάρτα δικτύου', BOX_BG, EDGE, ''),
    ]
    y = 20
    for i, (title, sub, fill, stroke, mode) in enumerate(rows):
        b.append(box(30, y, 330, 62, fill, stroke, 2.5 if stroke != EDGE else 2))
        b.append(text(195, y + 26, title, 17, 800))
        b.append(text(195, y + 48, sub, 13, 400, MUTED))
        if i < len(rows) - 1:
            b.append(arrow(195, y + 62, 195, y + 84))
        y += 84
    # the user/kernel boundary
    b.append(f'<line x1="20" y1="{20 + 2 * 84 - 11}" x2="480" y2="{20 + 2 * 84 - 11}" stroke="{BAD}" stroke-width="2" stroke-dasharray="7 5"/>')
    b.append(text(420, 20 + 84 + 36, 'user mode', 14, 700, ACC))
    b.append(text(420, 20 + 2 * 84 + 30, 'kernel mode', 14, 700, INK))
    b.append(text(420, 20 + 2 * 84 + 48, '(μόνο ο πυρήνας)', 12, 400, MUTED))
    b.append(text(W / 2, y + 6, 'Κάθε χρήστης που συνδέεται παίρνει δικό του φλοιό·', 14, 400, MUTED))
    b.append(text(W / 2, y + 26, 'οι εφαρμογές φτάνουν στο υλικό μόνο μέσω του πυρήνα.', 14, 400, MUTED))
    return svg(y + 40, 'Τα επίπεδα ενός συστήματος UNIX', b)


# ---- Σχήμα: redirections and a pipe (slides 56–83) -------------------------------
def streams():
    b = []

    def prog(x, y, name):
        b.append(box(x, y, 120, 46, TERM, TERM, 2, 8))
        b.append(text(x + 60, y + 29, name, 15, 700, '#d1e0ec', mono=True))

    def fileicon(x, y, name):
        b.append(f'<path d="M{x} {y} h46 l14 14 v50 h-60 z" fill="#ffffff" stroke="{EDGE}" stroke-width="2"/>')
        b.append(text(x + 30, y + 82, name, 13, 700, INK, mono=True))

    # 1. stdin / stdout / stderr
    b.append(text(20, 26, '1. Οι τρεις ροές', 15, 800, INK, 'start'))
    prog(200, 50, 'εντολή')
    b.append(arrow(110, 73, 196, 73, OK, 'ok'))
    b.append(text(102, 70, 'είσοδος', 13, 700, OK, 'end'))
    b.append(text(102, 86, 'πληκτρολόγιο', 12, 400, MUTED, 'end'))
    b.append(arrow(320, 63, 420, 50, INK, 'ink'))
    b.append(text(428, 46, 'έξοδος', 13, 700, INK, 'start'))
    b.append(text(428, 62, 'οθόνη', 12, 400, MUTED, 'start'))
    b.append(arrow(320, 85, 420, 104, BAD, 'bad'))
    b.append(text(428, 104, 'σφάλματα', 13, 700, BAD, 'start'))
    b.append(text(428, 120, 'οθόνη', 12, 400, MUTED, 'start'))

    # 2. > and >>
    y = 160
    b.append(text(20, y, '2. Ανακατεύθυνση εξόδου σε αρχείο', 15, 800, INK, 'start'))
    prog(40, y + 26, 'ls -l')
    b.append(arrow(160, y + 49, 268, y + 49, INK))
    b.append(text(214, y + 40, '>  ή  >>', 15, 800, ACC, 'middle', mono=True))
    fileicon(276, y + 18, 'info')
    b.append(text(356, y + 36, '>  αντικαθιστά', 13, 700, INK, 'start'))
    b.append(text(356, y + 56, '>> προσθέτει', 13, 700, INK, 'start'))
    b.append(text(356, y + 74, '    στο τέλος', 13, 400, MUTED, 'start'))

    # 3. pipe
    y = 300
    b.append(text(20, y, '3. Σωλήνωση: η έξοδος της μίας γίνεται είσοδος της άλλης', 15, 800, INK, 'start'))
    prog(30, y + 26, 'who')
    b.append(arrow(150, y + 49, 186, y + 49, ACC, 'acc', 3))
    prog(190, y + 26, 'sort')
    b.append(arrow(310, y + 49, 346, y + 49, ACC, 'acc', 3))
    prog(350, y + 26, 'wc -l')
    b.append(text(W / 2, y + 102, 'who | sort | wc -l : χωρίς προσωρινά αρχεία ανάμεσα στις εντολές.', 13, 400, MUTED))
    return svg(y + 120, 'Ροές, ανακατευθύνσεις και σωλήνωση', b)


# ---- Σχήμα: rwx bits and the octal number (slides 85–95) ---------------------
def bits():
    b = []
    mode = 0o754
    perm = ''.join(c if mode & (1 << (8 - i)) else '-' for i, c in enumerate('rwxrwxrwx'))
    assert perm == 'rwxr-xr--' and f'{mode:o}' == '754'
    groups = [('u: ιδιοκτήτης', ACC), ('g: ομάδα', INK), ('o: άλλοι', MUTED)]
    cw, x0, y0 = 46, 41, 64
    b.append(text(W / 2, 30, '-rwxr-xr--  σημαίνει  chmod 754', 18, 800, INK, mono=True))
    for g, (name, col) in enumerate(groups):
        gx = x0 + g * (3 * cw + 12)
        b.append(text(gx + 1.5 * cw, y0 - 8, name, 13, 700, col))
        digit = 0
        for k, (letter, val) in enumerate((('r', 4), ('w', 2), ('x', 1))):
            on = perm[3 * g + k] != '-'
            digit += val if on else 0
            x = gx + k * cw
            b.append(box(x, y0, cw - 4, 44, ACC_BG if on else '#ffffff', col if on else LINE, 2, 6))
            b.append(text(x + (cw - 4) / 2, y0 + 29, letter if on else '-', 20, 800, col if on else LINE, mono=True))
            b.append(text(x + (cw - 4) / 2, y0 + 64, str(val if on else 0), 15, 700, col if on else LINE))
        b.append(text(gx + 1.5 * cw, y0 + 96, f'{"+".join(str(v) for v, l in ((4, "r"), (2, "w"), (1, "x")) if l in perm[3 * g:3 * g + 3]) or "0"} = {digit}', 15, 700, col))
        b.append(text(gx + 1.5 * cw, y0 + 128, str(digit), 30, 800, col))
    b.append(text(W / 2, 250, 'r = 4, w = 2, x = 1. Κάθε ψηφίο είναι το άθροισμα μιας ομάδας.', 14, 400, MUTED))
    b.append(text(W / 2, 272, 'Το ίδιο συμβολικά: chmod u=rwx,g=rx,o=r', 14, 700, INK))
    return svg(290, 'Τα δικαιώματα rwx και ο οκταδικός αριθμός', b)


for name, fn in (('unix-layers', layers), ('unix-streams', streams), ('chmod-bits', bits)):
    out = fn()
    xml.dom.minidom.parseString(out)
    open(f'{OUT}/{name}.svg', 'w').write(out)
print('ok')
