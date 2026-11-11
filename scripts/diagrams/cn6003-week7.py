# CN6003 Week 7 diagrams («Βάσεις δεδομένων, το σχεσιακό μοντέλο, SQL & SQL injection»).
# Run: python3 scripts/diagrams/cn6003-week7.py src/content/lessons/cn6003/images
# Conceptual figures: table anatomy, ER model, keys/foreign keys, SQL-injection flow.
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
MONO = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace"
FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif"
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


def line(x1, y1, x2, y2, color=EDGE, w=2):
    return f'<line x1="{x1:g}" y1="{y1:g}" x2="{x2:g}" y2="{y2:g}" stroke="{color}" stroke-width="{w}"/>'


# ---- Σχήμα: anatomy of a relational table ----------------------------------
def table_anatomy():
    b = []
    cols = ['id', 'eponymo', 'onoma', 'poli']
    data = [
        ['1', 'Παπαδόπουλος', 'Κώστας', 'Πειραιάς'],
        ['2', 'Οικονόμου', 'Μαρία', 'Αθήνα'],
        ['3', 'Νικολάου', 'Ελένη', 'Πάτρα'],
    ]
    cw = [50, 140, 92, 92]
    tw = sum(cw)
    x0 = (W - tw) / 2
    y0 = 92
    rh = 32
    b.append(text(W / 2, 32, 'Η ανατομία ενός πίνακα (σχέση)', 16, 800))
    b.append(text(W / 2, 54, 'πίνακας mathites', 13, 600, MUTED, mono=True))

    # header
    xx = x0
    for j, c in enumerate(cols):
        fill = ACC_BG if j == 0 else '#e6edf2'
        b.append(box(xx, y0, cw[j], rh, fill, EDGE, 1.5, 0))
        b.append(text(xx + cw[j] / 2, y0 + 21, c, 13, 800, ACC if j == 0 else INK, mono=True))
        xx += cw[j]
    # body
    for i, row in enumerate(data):
        yy = y0 + rh * (i + 1)
        xx = x0
        for j, cell in enumerate(row):
            fill = '#faf4fb' if j == 0 else '#ffffff'
            b.append(box(xx, yy, cw[j], rh, fill, LINE, 1, 0))
            b.append(text(xx + cw[j] / 2, yy + 21, cell, 13, 700 if j == 0 else 400, INK, mono=True))
            xx += cw[j]

    tbottom = y0 + rh * (len(data) + 1)
    # annotation above: a column = a field / attribute
    colx = x0 + cw[0] + cw[1] / 2
    b.append(text(colx, y0 - 26, 'στήλη = πεδίο / γνώρισμα', 12.5, 700, INK))
    b.append(arrow(colx, y0 - 18, colx, y0 - 2, INK, 'ink', 2))
    # captions below (Greek words are long, so they live on their own lines)
    b.append(box(x0, tbottom + 14, cw[0], 22, ACC_BG, ACC, 1.5, 6))
    b.append(text(x0 + cw[0] / 2, tbottom + 29, 'PK', 12, 800, ACC, mono=True))
    b.append(text(x0 + cw[0] + 10, tbottom + 29, 'πρωτεύον κλειδί: μοναδική τιμή που ξεχωρίζει κάθε εγγραφή', 12, 400, MUTED, 'start'))
    b.append(text(x0, tbottom + 54, 'Κάθε γραμμή = μία εγγραφή (πλειάδα)· κάθε στήλη = ένα πεδίο (γνώρισμα).', 12, 400, MUTED, 'start'))
    return svg(tbottom + 74, 'Η ανατομία ενός πίνακα', b)


# ---- Σχήμα: the company ER model -------------------------------------------
def entity(cx, cy, w, h, name):
    return [box(cx - w / 2, cy - h / 2, w, h, '#e6eef4', INK, 2.5, 6), text(cx, cy + 5, name, 13.5, 800, INK, mono=True)]


def diamond(cx, cy, label, w=96, h=50, stroke=ACC, fill=ACC_BG):
    pts = f'{cx} {cy - h / 2} {cx + w / 2} {cy} {cx} {cy + h / 2} {cx - w / 2} {cy}'
    return [f'<polygon points="{pts}" fill="{fill}" stroke="{stroke}" stroke-width="2.5"/>', text(cx, cy + 4, label, 11, 800, stroke)]


def er_company():
    b = []
    b.append(text(W / 2, 30, 'Μοντέλο Οντοτήτων–Συσχετίσεων (ER): η βάση της εταιρείας', 15, 800))
    # entities
    dep = (250, 72)
    emp = (250, 236)
    pro = (250, 400)
    b += entity(*dep, 150, 44, 'DEPARTMENT')
    b += entity(*emp, 150, 44, 'EMPLOYEE')
    b += entity(*pro, 150, 44, 'PROJECT')
    # MANAGES (1:1) on the left, WORKS_FOR (1:N) on the right, both DEPARTMENT–EMPLOYEE
    man = (140, 154)
    wfor = (360, 154)
    won = (250, 318)
    # lines department -> diamonds -> employee
    b.append(line(dep[0] - 40, dep[1] + 22, man[0], man[1] - 22, EDGE, 2))
    b.append(line(man[0], man[1] + 22, emp[0] - 40, emp[1] - 22, EDGE, 2))
    b.append(line(dep[0] + 40, dep[1] + 22, wfor[0], wfor[1] - 22, EDGE, 2))
    b.append(line(wfor[0], wfor[1] + 22, emp[0] + 40, emp[1] - 22, EDGE, 2))
    b.append(line(emp[0], emp[1] + 22, won[0], won[1] - 25, EDGE, 2))
    b.append(line(won[0], won[1] + 25, pro[0], pro[1] - 22, EDGE, 2))
    b += diamond(*man, 'MANAGES')
    b += diamond(*wfor, 'WORKS_FOR')
    b += diamond(*won, 'WORKS_ON', 110)
    # cardinality labels
    lab = lambda x, y, s, col=INK: text(x, y, s, 13, 800, col)
    b.append(lab(118, 118, '1'))
    b.append(lab(118, 196, '1'))
    b.append(lab(382, 118, '1'))
    b.append(lab(382, 196, 'N'))
    b.append(lab(232, 284, 'M'))
    b.append(lab(232, 358, 'N'))
    # legend
    b.append(text(W / 2, 452, 'MANAGES 1:1 (μερική συμμετοχή του EMPLOYEE) · WORKS_FOR 1:N (ολική) · WORKS_ON M:N', 11.5, 400, MUTED))
    b.append(text(W / 2, 470, 'Ορθογώνιο = οντότητα · ρόμβος = συσχέτιση · οι αριθμοί = πολλαπλότητα', 11.5, 400, MUTED))
    return svg(486, 'Το μοντέλο ER της εταιρείας', b)


# ---- Σχήμα: primary key ↔ foreign key --------------------------------------
def keys_fk():
    b = []
    b.append(text(W / 2, 30, 'Πρωτεύον κλειδί ↔ ξένο κλειδί', 16, 800))

    def tbl(x, y, title, rows, key_idx, fk_idx):
        out = [text(x + 80, y - 8, title, 13, 800, INK, mono=True)]
        rh = 28
        for i, (name, tag) in enumerate(rows):
            yy = y + i * rh
            is_pk = i == key_idx
            is_fk = i == fk_idx
            fill = ACC_BG if is_pk else (OK_BG if is_fk else BOX_BG)
            stroke = ACC if is_pk else (OK if is_fk else EDGE)
            out.append(box(x, yy, 160, rh, fill, stroke, 2 if (is_pk or is_fk) else 1, 0))
            out.append(text(x + 10, yy + 18, name, 12.5, 700 if (is_pk or is_fk) else 400, INK, 'start', mono=True))
            if tag:
                out.append(text(x + 150, yy + 18, tag, 10.5, 800, stroke, 'end'))
        return out

    teacher = [('am', 'PK'), ('surname', ''), ('speciality', '')]
    course = [('id', 'PK'), ('title', ''), ('c_am', 'FK')]
    ty = 78
    b += tbl(40, ty, 'teacher', teacher, 0, -1)
    b += tbl(300, ty, 'course', course, 0, 2)
    # arrow from course.c_am -> teacher.am
    cx = 300 + 80
    camy = ty + 2 * 28 + 14
    amy = ty + 0 * 28 + 14
    b.append(f'<path d="M300 {camy} C 250 {camy}, 250 {amy}, 200 {amy}" fill="none" stroke="{OK}" stroke-width="2.5" marker-end="url(#a-ok)"/>')
    b.append(text(250, amy - 10, 'REFERENCES', 11, 800, OK))
    b.append(box(40, ty + 120, 420, 56, OK_BG, OK, 1.5))
    b.append(text(W / 2, ty + 142, 'Το ξένο κλειδί c_am στον course δείχνει στο πρωτεύον', 12.5, 700, INK))
    b.append(text(W / 2, ty + 160, 'κλειδί am του teacher — έτσι συνδέονται οι δύο πίνακες.', 12.5, 400, MUTED))
    return svg(ty + 196, 'Πρωτεύον και ξένο κλειδί', b)


# ---- Σχήμα: SQL-injection flow (vulnerable vs parameterised) ----------------
def sqli_flow():
    b = []
    b.append(text(W / 2, 28, 'Γιατί περνάει μια SQL injection — και πώς σταματά', 15, 800))
    colw = 224
    gap = 12
    x0 = (W - (2 * colw + gap)) / 2
    xr = x0 + colw + gap

    def column(x, titlecol, title, inp, query_lines, caption, capcol):
        out = [box(x, 46, colw, 290, '#ffffff', titlecol, 2.5, 12)]
        out.append(box(x, 46, colw, 28, titlecol, titlecol, 0, 12))
        out.append(text(x + colw / 2, 65, title, 13, 800, '#ffffff'))
        out.append(text(x + 14, 100, 'Είσοδος χρήστη:', 11.5, 700, MUTED, 'start'))
        out.append(box(x + 14, 108, colw - 28, 26, '#f4f6f8', EDGE, 1, 6))
        out.append(text(x + 20, 125, inp, 12, 700, INK, 'start', mono=True))
        out.append(text(x + 14, 158, 'Ερώτημα στη βάση:', 11.5, 700, MUTED, 'start'))
        yy = 176
        for ln, hl in query_lines:
            col = BAD if hl == 'bad' else (OK if hl == 'ok' else INK)
            wt = 800 if hl else 400
            out.append(text(x + 18, yy, ln, 10.5, wt, col, 'start', mono=True))
            yy += 16
        out.append(box(x + 12, 262, colw - 24, 62, '#f7f9fa', capcol, 1.5, 8))
        cy = 280
        for ln in caption:
            out.append(text(x + colw / 2, cy, ln, 10.8, 600, capcol))
            cy += 15
        return out

    b += column(
        x0, BAD, 'Ευάλωτο — ένωση κειμένου',
        "κωδικός:  ' OR '1'='1",
        [("...user='admin'", None), ("   AND pass='", None), ("   ' OR '1'='1'", 'bad'), ('→ το «ʼ» κλείνει το κείμενο', 'bad'), ("   '1'='1' πάντα αληθές", 'bad')],
        ['Η είσοδος έγινε εντολή:', 'πάντα αληθές → παράκαμψη'], BAD,
    )
    b += column(
        xr, OK, 'Ασφαλές — παραμετροποιημένο',
        "κωδικός:  ' OR '1'='1",
        [("...user = ?", 'ok'), ("   AND pass = ?", 'ok'), ('', None), ("params = [", None), ("  \"admin\", \"' OR '1'='1\" ]", 'ok')],
        ['Η είσοδος μένει δεδομένο:', 'ψάχνεται αυτούσια → αποτυγχάνει'], OK,
    )
    return svg(352, 'Ροή μιας SQL injection', b)


for name, fn in (('table-anatomy', table_anatomy), ('er-company', er_company), ('keys-fk', keys_fk), ('sqli-flow', sqli_flow)):
    out = fn()
    xml.dom.minidom.parseString(out)
    open(f'{OUT}/{name}.svg', 'w').write(out)
print('ok')
