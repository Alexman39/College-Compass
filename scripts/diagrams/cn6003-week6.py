# CN6003 Week 6 diagrams («Απειλές εναντίον CIA … & PATs»).
# Run: python3 scripts/diagrams/cn6003-week6.py src/content/lessons/cn6003/images
# Conceptual figures (web layers, PAT phases, red-team scope, hacker hats).
# Geometry is computed from the content so labels line up.
import sys
import xml.dom.minidom
from html import escape

OUT = sys.argv[1]
INK, MUTED, EDGE, LINE = '#0c2636', '#4a5a65', '#7b8a94', '#c9d3d9'
ACC, ACC_BG = '#841387', '#f3e6f4'
OK, OK_BG = '#2e7d32', '#e8f5e9'
BAD, BAD_BG = '#c62828', '#fdecea'
WARN, WARN_BG = '#a15c00', '#fff1d6'
BOX_BG = '#eef3f6'
FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif"
W = 500


def svg(h, title, body):
    defs = ''.join(
        f'<marker id="a-{n}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
        f'<path d="M0 0L10 5L0 10z" fill="{c}"/></marker>' for n, c in (('ink', INK), ('ok', OK), ('bad', BAD), ('acc', ACC), ('muted', EDGE)))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {h}" width="{W}" height="{h}" font-family="{FONT}">\n'
            f'  <title>{escape(title)}</title>\n  <defs>{defs}</defs>\n  <rect width="{W}" height="{h}" fill="#ffffff"/>\n'
            + '\n'.join('  ' + b for b in body) + '\n</svg>\n')


def text(x, y, s, size=16, weight=400, fill=INK, anchor='middle'):
    return f'<text x="{x:g}" y="{y:g}" text-anchor="{anchor}" font-size="{size}" font-weight="{weight}" fill="{fill}">{escape(s, quote=False)}</text>'


def box(x, y, w, h, fill=BOX_BG, stroke=EDGE, sw=2, rx=10):
    return f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'


def arrow(x1, y1, x2, y2, color=INK, name='ink', w=2.5):
    return f'<line x1="{x1:g}" y1="{y1:g}" x2="{x2:g}" y2="{y2:g}" stroke="{color}" stroke-width="{w}" marker-end="url(#a-{name})"/>'


# ---- Σχήμα: the layers of the web (slides 3–5) ------------------------------
def web_layers():
    b = []
    cx = W / 2
    data = [
        ('Surface Web', '#dcefff', INK, 60, 118, 150,
         ['≈ 4%: ό,τι ευρετηριάζει η Google']),
        ('Deep Web', '#aacde3', INK, 118, 232, 172,
         ['ό,τι ΔΕΝ ευρετηριάζεται:', 'email, e-banking, βάσεις,', 'συνδρομές — νόμιμο']),
        ('Dark Web', '#5f8097', '#ffffff', 232, 334, 205,
         ['σκόπιμα κρυμμένο·', 'πρόσβαση με ειδικό', 'λογισμικό (Tor)']),
    ]
    b.append(text(cx, 30, 'Τα επίπεδα του Web (παγόβουνο)', 16, 800))
    # waterline between surface and deep
    b.append(f'<line x1="30" y1="118" x2="470" y2="118" stroke="{EDGE}" stroke-width="2" stroke-dasharray="6 5"/>')
    for name, fill, tcol, yt, yb, half_top, desc in data:
        half_bot = half_top + (yb - yt) * 0.52
        b.append(f'<path d="M{cx - half_top:g} {yt} L{cx + half_top:g} {yt} '
                 f'L{cx + half_bot:g} {yb} L{cx - half_bot:g} {yb} Z" '
                 f'fill="{fill}" stroke="{EDGE}" stroke-width="1.5"/>')
        mid = yt + (yb - yt) / 2
        thin = (yb - yt) < 70
        ny = mid - (len(desc) * 8) if not thin else mid - 2
        b.append(text(cx, ny, name, 16, 800, tcol))
        for j, ln in enumerate(desc):
            b.append(text(cx, ny + 18 + j * 15, ln, 12, 400, tcol if tcol == '#ffffff' else MUTED))
    b.append(text(cx, 356, 'Προσοχή: Deep Web ≠ Dark Web. Το Deep Web είναι κυρίως νόμιμο', 13, 400, MUTED))
    b.append(text(cx, 374, '(οι δικοί σου λογαριασμοί)· το Dark Web είναι μικρό κομμάτι του.', 13, 400, MUTED))
    return svg(392, 'Τα επίπεδα του Web', b)


# ---- Σχήμα: the five PAT phases (slides 15–19) ------------------------------
def pat_phases():
    b = []
    phases = [['1.', 'Αναγνώριση'], ['2.', 'Σάρωση'], ['3.', 'Πρόσβαση'], ['4.', 'Μόνιμη', 'πρόσβαση'], ['5.', 'Αναφορά']]
    sub = ['recon', 'scanning', 'gaining', 'persistence', 'reporting']
    n = len(phases)
    bw, gap = 84, 11
    x0 = (W - (n * bw + (n - 1) * gap)) / 2
    y = 62
    for i, (p, s2) in enumerate(zip(phases, sub)):
        x = x0 + i * (bw + gap)
        last = i == n - 1
        b.append(box(x, y, bw, 72, OK_BG if last else ACC_BG, OK if last else ACC, 2.5))
        off = (len(p) - 1) * 8
        for j, ln in enumerate(p):
            b.append(text(x + bw / 2, y + 32 + j * 17 - off, ln, 13.5, 800))
        if not last:
            b.append(arrow(x + bw, y + 36, x + bw + gap, y + 36, INK, 'ink', 2.2))
    b.append(text(W / 2, 30, 'Οι πέντε φάσεις ενός penetration test', 16, 800))
    b.append(text(W / 2, 162, 'Ακολουθεί τη μεθοδολογία ενός επιτιθέμενου (Εβδομάδα 1):', 13, 400, MUTED))
    b.append(text(W / 2, 182, 'Recon → Scan → Access → Maintain →', 13, 700, INK))
    b.append(text(W / 2, 200, 'και αντί για Clearing Tracks, Αναφορά', 13, 400, MUTED))
    b.append(box(44, 220, 412, 48, OK_BG, OK, 2))
    b.append(text(W / 2, 240, 'Η 5η φάση είναι το προϊόν: αναφορά ευρημάτων', 13, 700, INK))
    b.append(text(W / 2, 258, 'με βαθμό κρισιμότητας και διορθώσεις — τίποτα δεν κρύβεται.', 12.5, 400, MUTED))
    return svg(288, 'Οι φάσεις του penetration testing', b)


# ---- Σχήμα: red teaming ⊃ pen testing (slides 10–11) ------------------------
def red_team():
    b = []
    b.append(text(W / 2, 28, 'Red Teaming έναντι Penetration Testing', 16, 800))
    b.append(box(36, 46, 428, 308, '#fdecec', BAD, 2.5, 14))
    b.append(text(56, 72, 'Red Teaming — προσομοίωση πλήρους επίθεσης', 14.5, 800, BAD, 'start'))
    fams = [
        ('Penetration Testing', ['Infrastructure (internal/external)', 'Web', 'Mobile'], ACC_BG, ACC),
        ('Social Engineering', ['Τηλέφωνο', 'E-mail (phishing)'], WARN_BG, WARN),
        ('Physical Intrusion', ['Lock picking', 'Camera evasion', 'Alarm bypass'], '#e6eef4', INK),
    ]
    y = 86
    for name, items, fill, stroke in fams:
        hgt = 22 + 17 * len(items) + 6
        b.append(box(56, y, 388, hgt, fill, stroke, 2))
        b.append(text(70, y + 21, name, 14, 800, stroke, 'start'))
        for j, it in enumerate(items):
            b.append(text(86, y + 40 + j * 17, '• ' + it, 12.5, 400, INK, 'start'))
        y += hgt + 8
    b.append(text(W / 2, 376, 'Το Penetration Testing είναι ένα κομμάτι του Red Teaming,', 13, 400, MUTED))
    b.append(text(W / 2, 394, 'που εκτείνεται και πέρα από το δίκτυο.', 13, 400, MUTED))
    return svg(412, 'Red Teaming και Penetration Testing', b)


# ---- Σχήμα: the three hats (slides 6–7) ------------------------------------
def hats():
    b = []
    b.append(text(W / 2, 28, 'Τα τρία καπέλα των hackers', 16, 800))
    cols = [
        ('White hat', OK, OK_BG, ['Με άδεια'], 'ethical hacker· βρίσκει και αναφέρει ευπάθειες, πληρώνεται νόμιμα'),
        ('Gray hat', WARN, WARN_BG, ['Χωρίς άδεια,', 'χωρίς κακό σκοπό'], 'βρίσκει ευπάθειες απρόσκλητος· ηθικά και νομικά γκρίζα ζώνη'),
        ('Black hat', BAD, BAD_BG, ['Χωρίς άδεια,', 'κακόβουλος'], 'παραβιάζει για όφελος ή ζημιά· είναι παράνομος'),
    ]
    cw, gap = 142, 13
    x0 = (W - (3 * cw + 2 * gap)) / 2
    for i, (name, col, bg, tag, desc) in enumerate(cols):
        x = x0 + i * (cw + gap)
        b.append(box(x, 50, cw, 222, bg, col, 2.5, 12))
        b.append(f'<path d="M{x + cw/2 - 26} 94 h52 l6 10 h-64 z" fill="{col}"/>')
        b.append(f'<rect x="{x + cw/2 - 16}" y="76" width="32" height="20" rx="4" fill="{col}"/>')
        b.append(text(x + cw / 2, 128, name, 15, 800, col))
        for j, ln in enumerate(tag):
            b.append(text(x + cw / 2, 152 + j * 16, ln, 12, 700, INK))
        words = desc.split(' ')
        line, yy = '', 200
        for wd in words:
            if len(line) + len(wd) > 19:
                b.append(text(x + cw / 2, yy, line.strip(), 11, 400, MUTED))
                line, yy = '', yy + 14
            line += wd + ' '
        b.append(text(x + cw / 2, yy, line.strip(), 11, 400, MUTED))
    return svg(288, 'White, gray και black hat hackers', b)


for name, fn in (('web-layers', web_layers), ('pat-phases', pat_phases), ('red-team', red_team), ('hacker-hats', hats)):
    out = fn()
    xml.dom.minidom.parseString(out)
    open(f'{OUT}/{name}.svg', 'w').write(out)
print('ok')
