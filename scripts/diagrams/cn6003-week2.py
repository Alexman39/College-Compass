# CN6003 Week 2 diagrams (Σχήματα 1–9 of «Μορφές επιθέσεων, ευπάθειες δικτύων
# και δέντρα επιθέσεων»).
# Run: python3 scripts/diagrams/cn6003-week2.py src/content/lessons/cn6003/images
# Positions are computed from the content, so boxes, arrows and labels line up
# exactly. Values (costs, probabilities) are the ones in the lesson; the bar
# chart's lengths are computed from them.
import sys
OUT = sys.argv[1]
INK, MUTED, EDGE, LINE = '#0c2636', '#4a5a65', '#7b8a94', '#c9d3d9'
ACC, ACC_BG = '#841387', '#f3e6f4'         # course accent: highlight
OK, OK_BG = '#2e7d32', '#e8f5e9'           # allowed / legitimate
BAD, BAD_BG = '#c62828', '#fdecea'         # attack / blocked
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


def lines(x, y, rows, size=16, weight=400, fill=INK, anchor='middle', gap=None):
    gap = gap or round(size * 1.3)
    return [text(x, y + i * gap, r, size, weight if i == 0 else 400, fill, anchor) for i, r in enumerate(rows)]


def box(x, y, w, h, fill=BOX_BG, stroke=EDGE, sw=2, rx=10, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ''
    return f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d}/>'


def arrow(x1, y1, x2, y2, color='ink', sw=2.5, dash=None):
    c = {'ink': INK, 'ok': OK, 'bad': BAD, 'acc': ACC, 'muted': EDGE}[color]
    d = f' stroke-dasharray="{dash}"' if dash else ''
    return f'<line x1="{x1:g}" y1="{y1:g}" x2="{x2:g}" y2="{y2:g}" stroke="{c}" stroke-width="{sw}"{d} marker-end="url(#a-{color})"/>'


# Σχήμα 1 — the attack chain, top to bottom (three boxes fit a phone better stacked).
def chain():
    b = []
    steps = [('Αδυναμία', 'λανθασμένη ρύθμιση ή σφάλμα', ACC_BG, ACC),
             ('Εκμετάλλευση', 'ο επιτιθέμενος αξιοποιεί το κενό', BOX_BG, EDGE),
             ('Επίπτωση', 'υποκλοπή, διακοπή ή πρόσβαση', BAD_BG, BAD)]
    x, w, h, y0, step = 60, 380, 64, 20, 96
    for i, (head, sub, fill, stroke) in enumerate(steps):
        y = y0 + i * step
        b.append(box(x, y, w, h, fill, stroke, 2.5))
        b.extend(lines(W / 2, y + 27, [head, sub], 18, 800))
        if i < 2:
            b.append(arrow(W / 2, y + h + 2, W / 2, y + step - 4))
    # prevention note, beside the first box
    b.append(text(W / 2, y0 + 3 * step + 6, 'Η πρόληψη στοχεύει στον πρώτο κρίκο:', 16, 700, ACC))
    b.append(text(W / 2, y0 + 3 * step + 28, 'κλείνει τις αδυναμίες πριν τις βρει κάποιος.', 16, 400, MUTED))
    return svg(y0 + 3 * step + 46, 'Η αλυσίδα μιας επίθεσης', b)


# Σχήμα 2 — normal resolution vs cache poisoning, two stacked panels.
def dns():
    b = []
    def panel(y, title, good):
        col, bg = (OK, OK_BG) if good else (BAD, BAD_BG)
        b.append(text(20, y + 18, title, 18, 800, col, 'start'))
        # three nodes
        nodes = [(14, 110, ['Χρήστης'], BOX_BG, EDGE), (200, 130, ['Διακομιστής', 'DNS'], BOX_BG, EDGE),
                 (356, 130, ['Νόμιμος' if good else 'Κακόβουλος', 'διακομιστής'], bg, col)]
        for nx, nw, rows, fill, stroke in nodes:
            b.append(box(nx, y + 34, nw, 60, fill, stroke, 2.5))
            b.extend(lines(nx + nw / 2, y + (69 if len(rows) == 1 else 59), rows, 16, 700))
        # cache strip under the DNS server
        cache = 'cache: σωστή εγγραφή' if good else 'cache: ψευδής εγγραφή'
        b.append(box(181, y + 102, 168, 28, '#ffffff' if good else BAD_BG, col, 2, 6, None if good else '5 4'))
        b.append(text(265, y + 121, cache, 13, 700, col))
        # ① question and ② answer between user and DNS
        b.append(arrow(126, y + 52, 196, y + 52, 'ink'))
        b.append(text(162, y + 41, '① όνομα;', 13, 700, MUTED))
        b.append(arrow(198, y + 80, 128, y + 80, 'ink'))
        b.append(text(162, y + 98, '② IP', 13, 700, MUTED))
        # ③ visit: from the user, round below, up to the third box
        yy = y + 152
        b.append(f'<path d="M69 {y + 94} V{yy} H421 V{y + 98}" fill="none" stroke="{col}" stroke-width="2.5" marker-end="url(#a-{"ok" if good else "bad"})"/>')
        b.append(text(245, yy + 22, '③ ο χρήστης πηγαίνει στη διεύθυνση που πήρε', 14, 400, MUTED))
    panel(10, 'Κανονική επίλυση', True)
    panel(210, 'Δηλητηρίαση cache (DNS cache poisoning)', False)
    return svg(400, 'DNS: κανονική επίλυση και δηλητηρίαση cache', b)


# Σχήμα 3 — ARP spoofing on a LAN.
def arp():
    b = []
    u, r, a = (90, 70), (410, 70), (250, 250)
    def node(c, name, fill=BOX_BG, stroke=EDGE):
        b.append(box(c[0] - 75, c[1] - 26, 150, 52, fill, stroke, 2.5))
        b.append(text(c[0], c[1] + 6, name, 17, 800))
    # normal path, dashed grey
    b.append(arrow(u[0] + 75, u[1] - 8, r[0] - 77, r[1] - 8, 'muted', 2.5, '7 6'))
    b.append(text(250, 46, 'κανονική διαδρομή', 15, 400, MUTED))
    # attacked path, solid red, via the attacker
    b.append(arrow(u[0] + 20, u[1] + 28, a[0] - 60, a[1] - 28, 'bad', 3))
    b.append(arrow(a[0] + 60, a[1] - 28, r[0] - 20, r[1] + 28, 'bad', 3))
    b.append(text(250, 140, 'μετά το ARP spoofing', 15, 700, BAD))
    node(u, 'Χρήστης')
    node(r, 'Δρομολογητής')
    node(a, 'Επιτιθέμενος', BAD_BG, BAD)
    b.extend(lines(250, 306, ['Ο επιτιθέμενος δηλώνει τη δική του MAC', 'ως MAC του δρομολογητή, οπότε η κίνηση', 'του χρήστη περνά από αυτόν.'], 15, 400, MUTED))
    return svg(360, 'ARP spoofing σε τοπικό δίκτυο', b)


# Σχήμα 4 — the TCP handshake vs a SYN flood, two stacked sequence diagrams.
def synflood():
    b = []
    cx, sx = 110, 390                      # client / server lifelines
    def lifelines(y0, y1, left='Πελάτης'):
        for x, name in ((cx, left), (sx, 'Διακομιστής')):
            b.append(box(x - 70, y0, 140, 34, BOX_BG, EDGE, 2, 8))
            b.append(text(x, y0 + 23, name, 16, 800))
            b.append(f'<line x1="{x}" y1="{y0 + 34}" x2="{x}" y2="{y1}" stroke="{LINE}" stroke-width="2" stroke-dasharray="4 4"/>')
    # top: normal handshake
    b.append(text(20, 22, 'Κανονική χειραψία', 18, 800, OK, 'start'))
    lifelines(36, 210)
    for i, (lab, left_to_right) in enumerate((('SYN', True), ('SYN-ACK', False), ('ACK', True))):
        y = 100 + i * 36
        x1, x2 = (cx + 4, sx - 4) if left_to_right else (sx - 4, cx + 4)
        b.append(arrow(x1, y, x2, y + 10, 'ink'))
        b.append(text(250, y - 2, lab, 15, 700))
    b.append(box(175, 200, 150, 30, OK_BG, OK, 2, 15))
    b.append(text(250, 220, 'σύνδεση ανοιχτή', 15, 700, OK))
    # bottom: SYN flood
    y0 = 262
    b.append(text(20, y0, 'SYN flood', 18, 800, BAD, 'start'))
    lifelines(y0 + 14, y0 + 218, 'Πλαστές IP')
    for i in range(4):
        y = y0 + 76 + i * 34
        b.append(arrow(cx + 4, y, sx - 4, y + 8, 'bad', 2.5))
        b.append(arrow(sx - 4, y + 14, cx + 60, y + 20, 'muted', 2, '5 4'))
    b.append(text(250, y0 + 70, 'SYN, SYN, SYN, …', 15, 700, BAD))
    b.append(text(250, y0 + 232, 'SYN-ACK που δεν παίρνουν ποτέ ACK', 14, 400, MUTED))
    # server's half-open table filling up
    tx, ty = sx + 18, y0 + 66
    b.append(text(tx + 36, ty - 8, 'μισάνοιχτες', 12, 700, BAD))
    for i in range(5):
        b.append(box(tx, ty + i * 24, 72, 20, BAD_BG if i < 4 else '#ffffff', BAD, 1.5, 3, None if i < 4 else '4 3'))
    b.append(text(tx + 36, ty + 5 * 24 + 16, 'γεμίζει', 13, 700, BAD))
    return svg(y0 + 246, 'Χειραψία TCP και SYN flood', b)


# Σχήμα 5 — firewall rule order: first match wins.
def firewall():
    b = []
    cols = [(20, 'Λάθος σειρά', [('Επίτρεψε όλα', True), ('Μπλόκαρε θύρα 23', False)], 0, 'περνά', BAD),
            (260, 'Σωστή σειρά', [('Μπλόκαρε θύρα 23', False), ('Επίτρεψε όλα', True)], 0, 'σταματά', OK)]
    for x, title, rules, hit, outcome, col in cols:
        b.append(text(x + 110, 24, title, 18, 800, col))
        b.append(box(x + 45, 40, 130, 34, '#ffffff', INK, 2, 17))
        b.append(text(x + 110, 63, 'πακέτο: θύρα 23', 14, 700))
        for i, (rule, allow) in enumerate(rules):
            y = 104 + i * 64
            matched = i == hit
            b.append(box(x, y, 220, 46, (OK_BG if allow else BAD_BG) if matched else BOX_BG,
                         (OK if allow else BAD) if matched else EDGE, 3 if matched else 2))
            b.append(text(x + 16, y + 29, f'{i + 1}.', 16, 800, MUTED, 'start'))
            b.append(text(x + 118, y + 29, rule, 16, 700))
        b.append(arrow(x + 110, 76, x + 110, 100, 'ink'))
        b.append(text(x + 110, 104 + 64 + 46 + 6 + 18, '✓ ταιριάζει ο κανόνας 1', 14, 700, col))
        b.append(text(x + 110, 104 + 64 + 46 + 6 + 40, f'→ το πακέτο {outcome}', 15, 800, col))
        b.append(text(x + 110, 104 + 64 + 46 + 6 + 62, 'ο κανόνας 2 δεν εξετάζεται', 13, 400, MUTED))
    b.append(text(W / 2, 312, 'Το firewall εφαρμόζει τον πρώτο κανόνα που ταιριάζει.', 15, 400, MUTED))
    return svg(326, 'Σειρά κανόνων firewall', b)


# Σχήμα 6 — university DMZ behind one three-legged firewall.
def dmz():
    b = []
    inet, fw, dz, lan = (250, 40), (250, 150), (120, 290), (380, 290)
    b.append(box(130, 12, 240, 58, BOX_BG, EDGE, 2.5, 29))
    b.extend(lines(250, 37, ['Διαδίκτυο', 'εξωτερικοί χρήστες'], 17, 800))
    b.append(box(185, 128, 130, 44, INK, INK, 2, 8))
    b.append(text(250, 156, 'Firewall', 17, 800, '#ffffff'))
    b.append(f'<line x1="250" y1="70" x2="250" y2="126" stroke="{INK}" stroke-width="3"/>')
    for (cx, cy), title, sub1, sub2, fill, stroke in ((dz, 'DMZ', 'web server', 'mail server', OK_BG, OK),
                                                     (lan, 'LAN', 'προσωπικό', 'και φοιτητές', BOX_BG, EDGE)):
        b.append(box(cx - 100, cy - 40, 200, 96, fill, stroke, 2.5))
        b.extend(lines(cx, cy - 10, [title, sub1, sub2], 17, 800))
        b.append(f'<line x1="{250 + (cx - 250) * 0.35:g}" y1="172" x2="{cx:g}" y2="{cy - 42}" stroke="{INK}" stroke-width="3"/>')
    # traffic: allowed to the DMZ, blocked to the LAN (curved arrows beside the cables)
    b.append(f'<path d="M160 70 C 135 130, 118 190, 112 244" fill="none" stroke="{OK}" stroke-width="3" marker-end="url(#a-ok)"/>')
    b.append(text(14, 160, 'επιτρέπεται', 15, 800, OK, 'start'))
    b.append(f'<path d="M340 70 C 365 120, 378 160, 382 196" fill="none" stroke="{BAD}" stroke-width="3" stroke-dasharray="7 6"/>')
    b.append(f'<path d="M370 196 l24 24 M394 196 l-24 24" stroke="{BAD}" stroke-width="4" stroke-linecap="round"/>')
    b.append(text(486, 160, 'αποκλείεται', 15, 800, BAD, 'end'))
    b.extend(lines(250, 372, ['Αν παραβιαστεί ο web server, η επίθεση', 'μένει στη DMZ· το LAN παραμένει προστατευμένο.'], 15, 400, MUTED))
    return svg(408, 'DMZ σε πανεπιστήμιο', b)


# Σχήματα 7 and 8 (the two attack trees) are ```attack-tree blocks in the
# lesson, drawn at build time by src/lib/attack-tree.ts.


# Σχήμα 9 — root probability under the three gate choices; bar lengths computed.
def bars():
    b = []
    data = [('OR παντού', 0.802, '80,2%'),
            ('AND στους κλάδους, OR στη ρίζα', 0.0139, '1,4%'),
            ('OR στους κλάδους, AND στη ρίζα', 0.056, '5,6%')]
    x0, x1 = 20, 400                       # 0% … 100%
    for i, (label, p, shown) in enumerate(data):
        y = 20 + i * 76
        b.append(text(x0, y + 16, label, 16, 700, INK, 'start'))
        b.append(f'<rect x="{x0}" y="{y + 26}" width="{x1 - x0}" height="26" rx="4" fill="{BOX_BG}"/>')
        w = max(p * (x1 - x0), 3)
        b.append(f'<rect x="{x0}" y="{y + 26}" width="{w:.1f}" height="26" rx="4" fill="{ACC}"/>')
        b.append(text(x0 + w + 8, y + 45, shown, 16, 800, ACC, 'start'))
    ya = 20 + 3 * 76 + 4
    for v in (0, 50, 100):
        x = x0 + v / 100 * (x1 - x0)
        b.append(f'<line x1="{x:g}" y1="{ya - 8}" x2="{x:g}" y2="{ya - 2}" stroke="{EDGE}" stroke-width="1.5"/>')
        b.append(text(x, ya + 14, f'{v}%', 13, 400, MUTED))
    b.append(text(W / 2, ya + 42, 'Πιθανότητα επιτυχίας της ρίζας. Υπόθεση: ανεξάρτητα γεγονότα.', 14, 400, MUTED))
    return svg(ya + 58, 'Η πιθανότητα της ρίζας για τρεις επιλογές τελεστών', b)


for name, fn in (('attack-chain', chain), ('dns-cache-poisoning', dns), ('arp-spoofing', arp),
                 ('syn-flood', synflood), ('firewall-rule-order', firewall), ('dmz-university', dmz),
                 ('attack-tree-gates', bars)):
    open(f'{OUT}/{name}.svg', 'w').write(fn())
print('ok')
