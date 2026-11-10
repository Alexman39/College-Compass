# CN6003 Week 1 diagrams (Σχήματα 1–2 of «Εισαγωγικές έννοιες ασφάλειας»).
# Run: python3 scripts/diagrams/cn6003-week1.py src/content/lessons/cn6003/images
# Same look as cn6003-week2.py: width 500, white background, course colours.
import sys
OUT = sys.argv[1]
INK, MUTED, EDGE = '#0c2636', '#4a5a65', '#7b8a94'
ACC, ACC_BG = '#841387', '#f3e6f4'
OK, OK_BG = '#2e7d32', '#e8f5e9'
BAD, BAD_BG = '#c62828', '#fdecea'
BOX_BG = '#eef3f6'
FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif"
W = 500


def svg(h, title, body):
    defs = ''.join(
        f'<marker id="a-{n}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
        f'<path d="M0 0L10 5L0 10z" fill="{c}"/></marker>'
        for n, c in (('ink', INK), ('ok', OK), ('bad', BAD), ('acc', ACC), ('muted', EDGE)))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {h}" width="{W}" height="{h}" font-family="{FONT}">\n'
            f'  <title>{title}</title>\n  <defs>{defs}</defs>\n  <rect width="{W}" height="{h}" fill="#ffffff"/>\n'
            + '\n'.join('  ' + b for b in body) + '\n</svg>\n')


def text(x, y, s, size=16, weight=400, fill=INK, anchor='middle'):
    return f'<text x="{x:g}" y="{y:g}" text-anchor="{anchor}" font-size="{size}" font-weight="{weight}" fill="{fill}">{s}</text>'


def box(x, y, w, h, fill=BOX_BG, stroke=EDGE, sw=2, rx=10, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ''
    return f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d}/>'


def arrow(x1, y1, x2, y2, color='ink', sw=2.5, dash=None):
    c = {'ink': INK, 'ok': OK, 'bad': BAD, 'acc': ACC, 'muted': EDGE}[color]
    d = f' stroke-dasharray="{dash}"' if dash else ''
    return f'<line x1="{x1:g}" y1="{y1:g}" x2="{x2:g}" y2="{y2:g}" stroke="{c}" stroke-width="{sw}"{d} marker-end="url(#a-{color})"/>'


# Σχήμα 1 — normal flow and the four attack forms, one lane each.
def forms():
    b = []
    lanes = [('Κανονική ροή', 'η σωστή, ανεμπόδιστη λειτουργία', OK),
             ('Διακοπή (Interruption)', 'πλήττει τη διαθεσιμότητα', BAD),
             ('Αναχαίτιση (Interception)', 'πλήττει την εμπιστευτικότητα', BAD),
             ('Τροποποίηση (Modification)', 'πλήττει την ακεραιότητα', BAD),
             ('Πλαστογράφηση (Fabrication)', 'πλήττει την αυθεντικότητα', BAD)]
    lane_h, y0 = 126, 8
    sx, sw_, rx_, rw = 14, 92, 394, 92      # source box x/width, receiver box x/width
    for i, (title, sub, col) in enumerate(lanes):
        y = y0 + i * lane_h
        b.append(text(14, y + 18, title, 16, 800, col, 'start'))
        b.append(text(W - 14, y + 18, sub, 13, 400, MUTED, 'end'))
        by = y + 34                          # boxes top
        mid = by + 22                        # arrow line
        b.append(box(sx, by, sw_, 44))
        b.append(text(sx + sw_ / 2, mid + 6, 'Πηγή', 16, 700))
        b.append(box(rx_, by, rw, 44))
        b.append(text(rx_ + rw / 2, mid + 6, 'Δέκτης', 16, 700))
        ax1, ax2 = sx + sw_ + 4, rx_ - 6
        cx = W / 2
        if i == 0:
            b.append(arrow(ax1, mid, ax2, mid, 'ok'))
        elif i == 1:
            b.append(f'<line x1="{ax1}" y1="{mid}" x2="{cx - 16}" y2="{mid}" stroke="{INK}" stroke-width="2.5"/>')
            b.append(f'<path d="M{cx - 10} {mid - 10}L{cx + 10} {mid + 10}M{cx + 10} {mid - 10}L{cx - 10} {mid + 10}" stroke="{BAD}" stroke-width="4"/>')
        else:
            # third party under the arrow
            tx, ty, tw, th = cx - 46, by + 50, 92, 26
            b.append(box(tx, ty, tw, th, BAD_BG, BAD, 2, 8))
            b.append(text(cx, ty + 18, 'Τρίτος', 14, 700, BAD))
            if i == 2:
                b.append(arrow(ax1, mid, ax2, mid))
                b.append(arrow(cx, mid + 2, cx, ty - 3, 'bad', 2))
            elif i == 3:
                b.append(arrow(ax1, mid, tx + 6, ty + 4, 'ink', 2.5))
                b.append(arrow(tx + tw - 6, ty + 4, ax2, mid, 'bad', 2.5))
            else:
                b.append(arrow(tx + tw - 6, ty + 4, ax2, mid, 'bad', 2.5))
    return svg(y0 + len(lanes) * lane_h, 'Η κανονική ροή και οι τέσσερις μορφές επιθέσεων', b)


# Σχήμα 2 — two VMs inside an isolated virtual network; no bridge to the NIC.
def lab():
    b = []
    b.append(box(14, 14, W - 28, 180, ACC_BG, ACC, 2.5, 14))
    b.append(text(W / 2, 40, 'Απομονωμένο εικονικό δίκτυο', 17, 800, ACC))
    b.append(box(34, 70, 150, 64, BOX_BG, EDGE, 2.5))
    b.append(text(109, 98, 'Kali Linux', 17, 800))
    b.append(text(109, 120, 'εργαλεία', 14, 400, MUTED))
    b.append(box(W - 184, 70, 150, 64, BOX_BG, EDGE, 2.5))
    b.append(text(W - 109, 98, 'OWASP BWA', 17, 800))
    b.append(text(W - 109, 120, 'ευάλωτος στόχος', 14, 400, MUTED))
    b.append(box(W / 2 - 44, 86, 88, 32, '#ffffff', EDGE, 2, 8))
    b.append(text(W / 2, 107, 'v-switch', 14, 700))
    b.append(f'<line x1="184" y1="102" x2="{W / 2 - 44}" y2="102" stroke="{INK}" stroke-width="2.5"/>')
    b.append(f'<line x1="{W / 2 + 44}" y1="102" x2="{W - 184}" y2="102" stroke="{INK}" stroke-width="2.5"/>')
    b.append(text(W / 2, 170, 'Οι δύο VMs βλέπουν μόνο η μία την άλλη', 14, 400, MUTED))
    # outside: NIC and Internet, crossed-out link
    b.append(box(60, 262, 160, 48, BOX_BG, EDGE, 2))
    b.append(text(140, 292, 'Κάρτα δικτύου', 15, 700))
    b.append(box(W - 220, 262, 160, 48, BOX_BG, EDGE, 2))
    b.append(text(W - 140, 292, 'Internet', 15, 700))
    for x in (140, W - 140):
        b.append(f'<line x1="{x}" y1="196" x2="{x}" y2="258" stroke="{EDGE}" stroke-width="2.5" stroke-dasharray="6 5"/>')
        b.append(f'<path d="M{x - 11} 216L{x + 11} 238M{x + 11} 216L{x - 11} 238" stroke="{BAD}" stroke-width="4"/>')
    b.append(text(140, 334, 'χωρίς bridging', 15, 800, BAD))
    b.append(text(W - 140, 334, 'χωρίς Internet', 15, 800, BAD))
    return svg(348, 'Το εργαστήριο: δύο VMs σε απομονωμένο εικονικό δίκτυο', b)


for name, fn in (('attack-forms', forms), ('isolated-lab', lab)):
    with open(f'{OUT}/{name}.svg', 'w', encoding='utf-8') as f:
        f.write(fn())
print('ok')
