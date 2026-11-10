# CN6003 Week 4 diagrams (Σχήματα 1–3 of «Ανάλυση πακέτων με το Wireshark»).
# Run: python3 scripts/diagrams/cn6003-week4.py src/content/lessons/cn6003/images
# Same look as cn6003-week1.py / cn6003-week2.py. Sizes are the lesson's.
import sys
OUT = sys.argv[1]
INK, MUTED, EDGE = '#0c2636', '#4a5a65', '#7b8a94'
ACC, ACC_BG = '#841387', '#f3e6f4'
OK, OK_BG = '#2e7d32', '#e8f5e9'
BOX_BG = '#eef3f6'
BLUE_BG, BLUE = '#e3eefb', '#2a62a8'
ORANGE_BG, ORANGE = '#fdeee2', '#b5541c'
FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif"
W = 500


def svg(h, title, body):
    defs = (f'<marker id="a-ink" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
            f'<path d="M0 0L10 5L0 10z" fill="{INK}"/></marker>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {h}" width="{W}" height="{h}" font-family="{FONT}">\n'
            f'  <title>{title}</title>\n  <defs>{defs}</defs>\n  <rect width="{W}" height="{h}" fill="#ffffff"/>\n'
            + '\n'.join('  ' + b for b in body) + '\n</svg>\n')


def text(x, y, s, size=15, weight=400, fill=INK, anchor='middle'):
    return f'<text x="{x:g}" y="{y:g}" text-anchor="{anchor}" font-size="{size}" font-weight="{weight}" fill="{fill}">{s}</text>'


def box(x, y, w, h, fill=BOX_BG, stroke=EDGE, sw=2, rx=6):
    return f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'


def arrow(x1, y1, x2, y2):
    return f'<line x1="{x1:g}" y1="{y1:g}" x2="{x2:g}" y2="{y2:g}" stroke="{INK}" stroke-width="2.5" marker-end="url(#a-ink)"/>'


# Σχήμα 1 — encapsulation: each layer adds its header around the one above.
def encapsulation():
    b = []
    rows = [  # label, header label, header colour, indent of the data block
        ('HTTP', None, None, 'δεδομένα εφαρμογής'),
        ('TCP segment', 'TCP', (OK_BG, OK), 'δεδομένα HTTP'),
        ('IPv4 packet', 'IPv4 20 B', (BLUE_BG, BLUE), 'TCP segment'),
        ('Ethernet frame', 'Ethernet 14 B', (ORANGE_BG, ORANGE), 'IPv4 packet'),
    ]
    x0, x1, rh, gap, y0 = 20, W - 20, 40, 30, 14
    for i, (name, hdr, col, payload) in enumerate(rows):
        y = y0 + i * (rh + gap)
        b.append(text(x0, y + 12, name, 14, 800, MUTED, 'start'))
        y += 18
        hw = 0 if hdr is None else 112
        hx = x0 + (3 - i) * 0  # all rows full width; headers stack on the left
        if hdr:
            b.append(box(x0, y, hw, rh, col[0], col[1], 2))
            b.append(text(x0 + hw / 2, y + 25, hdr, 14, 700, INK))
        tail = 56 if name == 'Ethernet frame' else 0
        b.append(box(x0 + hw, y, x1 - x0 - hw - tail, rh, ACC_BG if i == 0 else BOX_BG, ACC if i == 0 else EDGE, 2))
        b.append(text(x0 + hw + (x1 - x0 - hw - tail) / 2, y + 25, payload, 14, 600))
        if tail:
            b.append(box(x1 - tail, y, tail, rh, ORANGE_BG, ORANGE, 2))
            b.append(text(x1 - tail / 2, y + 25, 'FCS 4 B', 12, 700))
    h = y0 + 4 * (rh + gap) + 8
    b.append(text(W / 2, h + 6, 'Κάθε επίπεδο προσθέτει τη δική του επικεφαλίδα·', 13, 400, MUTED))
    b.append(text(W / 2, h + 24, 'στη λήψη αφαιρούνται με την αντίστροφη σειρά.', 13, 400, MUTED))
    return svg(h + 34, 'Ενθυλάκωση: HTTP μέσα σε TCP μέσα σε IPv4 μέσα σε Ethernet', b)


# Σχήμα 2 — IPv4 header in 32-bit rows (bit widths to scale).
def ipv4_header():
    b = []
    rows = [
        [('Version', 4), ('IHL', 4), ('DSCP / ECN', 8), ('Total Length', 16)],
        [('Identification', 16), ('Flags', 3), ('Fragment Offset', 13)],
        [('TTL', 8), ('Protocol', 8), ('Header Checksum', 16)],
        [('Source Address', 32)],
        [('Destination Address', 32)],
        [('Options / Padding (προαιρετικά)', 32)],
    ]
    x0, wbits, rh, y0 = 46, W - 46 - 14, 44, 30
    unit = wbits / 32
    for t, lab in ((0, '0'), (8, '8'), (16, '16'), (24, '24'), (31, '31')):
        b.append(text(x0 + (t + 0.5) * unit, 20, lab, 12, 600, MUTED))
    for i, row in enumerate(rows):
        y = y0 + i * rh
        x = x0
        b.append(text(x0 - 8, y + 27, f'{i * 4}', 12, 600, MUTED, 'end'))
        for name, bits in row:
            w = bits * unit
            opt = name.startswith('Options')
            fill, stroke = (('#ffffff', EDGE) if opt else (BLUE_BG, BLUE)) if name not in ('Source Address', 'Destination Address') else (ACC_BG, ACC)
            dash = ' stroke-dasharray="6 4"' if opt else ''
            b.append(f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{rh}" fill="{fill}" stroke="{stroke}" stroke-width="1.5"{dash}/>')
            size = 13 if w > 70 else 11
            b.append(text(x + w / 2, y + 21, name, size, 700))
            b.append(text(x + w / 2, y + 36, f'{bits} bit', 11, 400, MUTED))
            x += w
    h = y0 + len(rows) * rh
    b.append(text(W / 2, h + 22, 'Συνήθως 5 γραμμές × 4 bytes = 20 bytes (IHL = 5)· έως 60 με options.', 13, 400, MUTED))
    return svg(h + 34, 'Η επικεφαλίδα IPv4 σε γραμμές των 32 bit', b)


# Σχήμα 3 — demultiplexing: EtherType → IP Protocol → port → application.
def demux():
    b = []
    cols = [('Ethernet', 'EtherType', ['0x0800 IPv4', '0x0806 ARP', '0x86DD IPv6']),
            ('IPv4', 'Protocol', ['1 ICMP', '6 TCP', '17 UDP']),
            ('TCP / UDP', 'Θύρα', ['53 DNS', '80 HTTP', '443 HTTPS']),
            ('Εφαρμογή', '', ['DNS resolver', 'web server', 'web server (TLS)'])]
    cw, gapx, x0, y0 = 104, 20, 14, 16
    for i, (layer, field, vals) in enumerate(cols):
        x = x0 + i * (cw + gapx)
        b.append(text(x + cw / 2, y0 + 14, layer, 15, 800))
        if field:
            b.append(text(x + cw / 2, y0 + 32, f'πεδίο: {field}', 12, 400, MUTED))
        for j, v in enumerate(vals):
            y = y0 + 46 + j * 50
            hl = (i, j) in ((0, 0), (1, 1), (2, 1), (3, 1))
            b.append(box(x, y, cw, 36, ACC_BG if hl else BOX_BG, ACC if hl else EDGE, 2.5 if hl else 1.5))
            b.append(text(x + cw / 2, y + 23, v, 13, 700 if hl else 400))
        if i < 3:
            yy = y0 + 46 + 50 + 18
            if i == 0:
                yy = y0 + 46 + 18
            b.append(arrow(x + cw + 2, yy if i else y0 + 64, x + cw + gapx - 2, y0 + 46 + 50 + 18))
    h = y0 + 46 + 3 * 50 + 6
    b.append(text(W / 2, h + 10, 'Παράδειγμα: 0x0800 → 6 → 80 · το πλαίσιο φτάνει στον web server.', 13, 400, MUTED))
    return svg(h + 22, 'Demultiplexing: EtherType, IP Protocol, θύρα, εφαρμογή', b)


for name, fn in (('encapsulation', encapsulation), ('ipv4-header', ipv4_header), ('demux', demux)):
    with open(f'{OUT}/{name}.svg', 'w', encoding='utf-8') as f:
        f.write(fn())
print('ok')
