/**
 * A tiny, fully in-memory SQL engine for the CN6003 Week 7 labs (databases &
 * SQL injection). It evaluates a small subset of SELECT — enough to run the
 * SQL playground and to *demonstrate* how an injection bends a query — against
 * a few seeded tables that live only in this module.
 *
 * Nothing here touches a real database, a network, or the page's storage: the
 * "attack" is a string that changes the meaning of a query we build and parse
 * ourselves, so the student can watch the mechanism and then watch the
 * parameterised version refuse it. Pure logic, covered by sql-lab.test.ts.
 */

// ---- the seeded world -------------------------------------------------------

export type Row = Record<string, string | number>;
export type Table = { columns: string[]; rows: Row[] };

/**
 * A fake company database. The `users` table drives the login lab; `secrets`
 * is the "forbidden" table a UNION injection tries to read; `products` gives
 * the playground something friendly to query. All data is invented.
 */
export const DB: Record<string, Table> = {
  users: {
    columns: ['id', 'username', 'display_name', 'password', 'role'],
    rows: [
      { id: 1, username: 'admin', display_name: 'Διαχειριστής', password: 'S3cur3!Pass', role: 'admin' },
      { id: 2, username: 'elena', display_name: 'Έλενα Παπαδοπούλου', password: 'kalimera12', role: 'user' },
      { id: 3, username: 'kostas', display_name: 'Κώστας Οικονόμου', password: 'piraeus-77', role: 'user' },
      { id: 4, username: 'maria', display_name: 'Μαρία Νικολάου', password: 'rain_blue_9', role: 'editor' },
    ],
  },
  secrets: {
    columns: ['id', 'label', 'value'],
    rows: [
      { id: 1, label: 'api_key', value: 'sk-DEMO-9f2c-not-real' },
      { id: 2, label: 'db_root', value: 'root:changeme (demo)' },
      { id: 3, label: 'card', value: '4000-0000-0000-0002 (demo)' },
    ],
  },
  products: {
    columns: ['id', 'name', 'category', 'price', 'stock'],
    rows: [
      { id: 1, name: 'Πληκτρολόγιο', category: 'Περιφερειακά', price: 25, stock: 40 },
      { id: 2, name: 'Ποντίκι', category: 'Περιφερειακά', price: 15, stock: 120 },
      { id: 3, name: 'Οθόνη 24"', category: 'Οθόνες', price: 150, stock: 12 },
      { id: 4, name: 'Οθόνη 27"', category: 'Οθόνες', price: 220, stock: 7 },
      { id: 5, name: 'SSD 1TB', category: 'Αποθήκευση', price: 80, stock: 0 },
    ],
  },
};

function table(name: string): Table {
  const t = DB[name.toLowerCase()];
  if (!t) throw new SqlError(`Άγνωστος πίνακας: ${name}`);
  return t;
}

export class SqlError extends Error {}

// ---- tokeniser --------------------------------------------------------------

type Tok =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'id'; v: string }
  | { t: 'op'; v: string }
  | { t: 'star' }
  | { t: 'comma' }
  | { t: 'lparen' }
  | { t: 'rparen' };


/**
 * Turn a query string into tokens. Importantly, `#` and `-- ` start a comment
 * that runs to the end of the line — exactly the MySQL behaviour that lets an
 * injected `admin'#` chop off the rest of a query.
 */
export function tokenize(sql: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i]!;
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    // comments to end of line
    if (c === '#' || (c === '-' && sql[i + 1] === '-')) {
      while (i < n && sql[i] !== '\n') i++;
      continue;
    }
    if (c === "'" || c === '"') {
      const quote = c;
      let v = '';
      i++;
      while (i < n) {
        if (sql[i] === quote) {
          if (sql[i + 1] === quote) { v += quote; i += 2; continue; } // '' escape
          i++;
          break;
        }
        v += sql[i++];
      }
      out.push({ t: 'str', v });
      continue;
    }
    if (c >= '0' && c <= '9') {
      let v = '';
      while (i < n && /[0-9.]/.test(sql[i]!)) v += sql[i++];
      out.push({ t: 'num', v: Number(v) });
      continue;
    }
    if (/[A-Za-z_Ͱ-Ͽἀ-῿]/.test(c)) {
      let v = '';
      while (i < n && /[A-Za-z0-9_Ͱ-Ͽἀ-῿.]/.test(sql[i]!)) v += sql[i++];
      out.push({ t: 'id', v });
      continue;
    }
    if (c === '*') { out.push({ t: 'star' }); i++; continue; }
    if (c === ',') { out.push({ t: 'comma' }); i++; continue; }
    if (c === '(') { out.push({ t: 'lparen' }); i++; continue; }
    if (c === ')') { out.push({ t: 'rparen' }); i++; continue; }
    // two- and one-char operators
    const two = sql.slice(i, i + 2);
    if (['<=', '>=', '<>', '!='].includes(two)) { out.push({ t: 'op', v: two }); i += 2; continue; }
    if (['=', '<', '>'].includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
    throw new SqlError(`Μη αναμενόμενος χαρακτήρας: ${c}`);
  }
  return out;
}

const kw = (tok: Tok | undefined, word: string) => !!tok && tok.t === 'id' && tok.v.toLowerCase() === word;

// ---- WHERE expression: parser + evaluator ----------------------------------
// Precedence (loosest first): OR → AND → NOT → comparison → primary.

type Expr =
  | { k: 'or'; a: Expr; b: Expr }
  | { k: 'and'; a: Expr; b: Expr }
  | { k: 'not'; a: Expr }
  | { k: 'cmp'; op: string; a: Expr; b: Expr }
  | { k: 'col'; name: string }
  | { k: 'lit'; v: string | number }
  | { k: 'null' };

class Parser {
  pos = 0;
  constructor(readonly toks: Tok[]) {}
  peek() { return this.toks[this.pos]; }
  next() { return this.toks[this.pos++]; }
  atEnd() { return this.pos >= this.toks.length; }

  parseExpr(): Expr { return this.parseOr(); }

  parseOr(): Expr {
    let a = this.parseAnd();
    while (kw(this.peek(), 'or')) { this.next(); a = { k: 'or', a, b: this.parseAnd() }; }
    return a;
  }
  parseAnd(): Expr {
    let a = this.parseNot();
    while (kw(this.peek(), 'and')) { this.next(); a = { k: 'and', a, b: this.parseNot() }; }
    return a;
  }
  parseNot(): Expr {
    if (kw(this.peek(), 'not')) { this.next(); return { k: 'not', a: this.parseNot() }; }
    return this.parseCmp();
  }
  parseCmp(): Expr {
    const a = this.parsePrimary();
    const p = this.peek();
    if (p && p.t === 'op') { this.next(); return { k: 'cmp', op: p.v, a, b: this.parsePrimary() }; }
    if (kw(p, 'like')) { this.next(); return { k: 'cmp', op: 'like', a, b: this.parsePrimary() }; }
    return a;
  }
  parsePrimary(): Expr {
    const tk = this.next();
    if (!tk) throw new SqlError('Η συνθήκη WHERE τελειώνει απότομα.');
    if (tk.t === 'lparen') { const e = this.parseExpr(); const r = this.next(); if (!r || r.t !== 'rparen') throw new SqlError('Λείπει «)».'); return e; }
    if (tk.t === 'num') return { k: 'lit', v: tk.v };
    if (tk.t === 'str') return { k: 'lit', v: tk.v };
    if (tk.t === 'id') {
      const low = tk.v.toLowerCase();
      if (low === 'null') return { k: 'null' };
      if (low === 'true') return { k: 'lit', v: 1 };
      if (low === 'false') return { k: 'lit', v: 0 };
      return { k: 'col', name: tk.v };
    }
    throw new SqlError('Περίμενα τιμή ή στήλη στη συνθήκη.');
  }
}

function value(e: Expr, row: Row): string | number | null {
  if (e.k === 'lit') return e.v;
  if (e.k === 'null') return null;
  if (e.k === 'col') {
    const key = e.name.includes('.') ? e.name.split('.').pop()! : e.name;
    if (!(key in row)) throw new SqlError(`Άγνωστη στήλη: ${e.name}`);
    return row[key]!;
  }
  // a boolean sub-expression used where a value is expected → 1/0
  return evalBool(e, row) ? 1 : 0;
}

function like(text: string, pattern: string): boolean {
  let rx = '';
  for (const ch of pattern) {
    if (ch === '%') rx += '[\\s\\S]*';
    else if (ch === '_') rx += '[\\s\\S]';
    else rx += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${rx}$`, 'i').test(text);
}

function compare(op: string, a: string | number | null, b: string | number | null): boolean {
  if (op === 'like') return like(String(a ?? ''), String(b ?? ''));
  if (a === null || b === null) return false;
  const bothNum = typeof a === 'number' && typeof b === 'number';
  const [x, y] = bothNum ? [a as number, b as number] : [String(a), String(b)];
  switch (op) {
    case '=': return x === y;
    case '<>': case '!=': return x !== y;
    case '<': return x < y;
    case '<=': return x <= y;
    case '>': return x > y;
    case '>=': return x >= y;
    default: throw new SqlError(`Άγνωστος τελεστής: ${op}`);
  }
}

function truthy(v: string | number | null): boolean {
  if (v === null) return false;
  if (typeof v === 'number') return v !== 0;
  return v !== '' && v !== '0';
}

function evalBool(e: Expr, row: Row): boolean {
  switch (e.k) {
    case 'or': return evalBool(e.a, row) || evalBool(e.b, row);
    case 'and': return evalBool(e.a, row) && evalBool(e.b, row);
    case 'not': return !evalBool(e.a, row);
    case 'cmp': return compare(e.op, value(e.a, row), value(e.b, row));
    default: return truthy(value(e, row));
  }
}

/** Parse a WHERE condition string on its own (used by the login lab). */
export function parseWhere(cond: string): Expr {
  const p = new Parser(tokenize(cond));
  const e = p.parseExpr();
  if (!p.atEnd()) throw new SqlError('Περίσσεια στη συνθήκη WHERE.');
  return e;
}

// ---- SELECT -----------------------------------------------------------------

export type QueryResult = { columns: string[]; rows: Row[] };

function runSelect(p: Parser): QueryResult {
  const first = p.next();
  if (!kw(first, 'select')) throw new SqlError('Το ερώτημα πρέπει να αρχίζει με SELECT.');

  // column list: * or a comma-separated list of columns / literals
  const cols: { expr: Expr | '*'; label: string }[] = [];
  for (;;) {
    const t = p.peek();
    if (t && t.t === 'star') { p.next(); cols.push({ expr: '*', label: '*' }); }
    else {
      const e = p.parsePrimary();
      const label = e.k === 'col' ? e.name : e.k === 'lit' ? String(e.v) : 'expr';
      cols.push({ expr: e, label });
    }
    if (p.peek() && p.peek()!.t === 'comma') { p.next(); continue; }
    break;
  }

  if (!kw(p.peek(), 'from')) throw new SqlError('Λείπει το FROM <πίνακας>.');
  p.next();
  const nameTok = p.next();
  if (!nameTok || nameTok.t !== 'id') throw new SqlError('Λείπει το όνομα του πίνακα.');
  const src = table(nameTok.v);

  // The WHERE expression parser naturally stops at ORDER / LIMIT / UNION,
  // since those are identifiers it never consumes as operators.
  let where: Expr | null = null;
  if (kw(p.peek(), 'where')) {
    p.next();
    where = p.parseExpr();
  }

  // Filter first, keeping full rows so ORDER BY may sort on a column that the
  // SELECT list does not project (standard SQL).
  let rows = where ? src.rows.filter((r) => evalBool(where!, r)) : src.rows.slice();

  // ORDER BY <col> [ASC|DESC]
  if (kw(p.peek(), 'order')) {
    p.next();
    if (!kw(p.peek(), 'by')) throw new SqlError('Μετά το ORDER περίμενα BY.');
    p.next();
    const colTok = p.next();
    if (!colTok || colTok.t !== 'id') throw new SqlError('Λείπει στήλη στο ORDER BY.');
    const key = colTok.v;
    let desc = false;
    if (kw(p.peek(), 'asc')) p.next();
    else if (kw(p.peek(), 'desc')) { desc = true; p.next(); }
    rows.sort((a, b) => {
      const x = a[key]!, y = b[key]!;
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'el');
      return desc ? -c : c;
    });
  }

  // LIMIT n
  if (kw(p.peek(), 'limit')) {
    p.next();
    const nTok = p.next();
    if (!nTok || nTok.t !== 'num') throw new SqlError('Μετά το LIMIT περίμενα αριθμό.');
    rows = rows.slice(0, nTok.v);
  }

  // Project last.
  const star = cols.length === 1 && cols[0]!.expr === '*';
  const outCols = star ? src.columns : cols.map((c) => c.label);
  const projected = star
    ? rows.map((r) => ({ ...r }))
    : rows.map((r) => {
        const o: Row = {};
        cols.forEach((c) => { o[c.label] = c.expr === '*' ? '' : ((value(c.expr, r) ?? 'NULL') as string | number); });
        return o;
      });

  return { columns: outCols, rows: projected };
}

/**
 * Run a SELECT, including top-level `UNION` of several SELECTs. A UNION needs
 * both sides to return the same number of columns — the exact constraint an
 * attacker has to satisfy, which is why injections start with `UNION SELECT
 * null, null`.
 */
export function runQuery(sql: string): QueryResult {
  const p = new Parser(tokenize(sql));
  let result = runSelect(p);
  while (kw(p.peek(), 'union')) {
    p.next();
    if (kw(p.peek(), 'all')) p.next();
    const next = runSelect(p);
    if (next.columns.length !== result.columns.length)
      throw new SqlError(`Το UNION απαιτεί ίδιο πλήθος στηλών (${result.columns.length} ≠ ${next.columns.length}).`);
    result = { columns: result.columns, rows: [...result.rows, ...next.rows.map((r) => renameTo(r, result.columns))] };
  }
  if (!p.atEnd()) throw new SqlError('Περίσσεια μετά το τέλος του ερωτήματος.');
  return result;
}

function renameTo(row: Row, columns: string[]): Row {
  const vals = Object.values(row);
  const o: Row = {};
  columns.forEach((c, i) => { o[c] = vals[i] ?? ''; });
  return o;
}

// ---- the login lab ----------------------------------------------------------

export type LoginResult = {
  mode: 'vulnerable' | 'safe';
  /** The query string actually built (with the placeholder form for safe). */
  query: string;
  /** Parameters bound separately in safe mode. */
  params?: string[];
  rows: Row[];
  ok: boolean;
  /** true when login succeeded without the real username+password pair. */
  bypassed: boolean;
  error?: string;
};

const realPairExists = (u: string, pw: string) =>
  DB.users!.rows.some((r) => r.username === u && r.password === pw);

/**
 * The vulnerable login glues the raw input straight into the SQL string, so a
 * quote in the input ends the literal and the rest becomes query logic — the
 * classic `' OR '1'='1` bypass, or `admin'#` to comment the password check
 * away. The safe login binds the input as parameters, so the same text is only
 * ever data.
 */
export function runLogin(username: string, password: string, mode: 'vulnerable' | 'safe'): LoginResult {
  if (mode === 'safe') {
    const query = "SELECT * FROM users WHERE username = ? AND password = ?";
    const rows = DB.users!.rows.filter((r) => r.username === username && r.password === password);
    return { mode, query, params: [username, password], rows, ok: rows.length > 0, bypassed: false };
  }
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
  try {
    const where = parseWhere(query.slice(query.indexOf('WHERE') + 5));
    const rows = DB.users!.rows.filter((r) => evalBool(where, r));
    const ok = rows.length > 0;
    return { mode, query, rows, ok, bypassed: ok && !realPairExists(username, password) };
  } catch (e) {
    return { mode, query, rows: [], ok: false, bypassed: false, error: (e as Error).message };
  }
}

/**
 * The product/user search: vulnerable mode builds a LIKE query by
 * concatenation, so a `%' UNION SELECT label, value FROM secrets #` payload
 * reads a table the page never meant to expose. Safe mode filters rows in
 * code, so the payload is just a (fruitless) search term.
 */
export type SearchResult = QueryResult & { mode: 'vulnerable' | 'safe'; query: string; error?: string; leaked: boolean };

export function runSearch(input: string, mode: 'vulnerable' | 'safe'): SearchResult {
  if (mode === 'safe') {
    const query = "SELECT display_name, username FROM users WHERE display_name LIKE ?";
    const rows = DB.users!.rows
      .filter((r) => like(String(r.display_name), `%${input}%`))
      .map((r) => ({ display_name: r.display_name!, username: r.username! }));
    return { mode, query, columns: ['display_name', 'username'], rows, leaked: false };
  }
  const query = `SELECT display_name, username FROM users WHERE display_name LIKE '%${input}%'`;
  try {
    const res = runQuery(query);
    const leaked = res.rows.some((r) => Object.values(r).some((v) => String(v).includes('DEMO') || String(v).includes('demo')));
    return { mode, query, columns: res.columns, rows: res.rows, leaked };
  } catch (e) {
    return { mode, query, columns: [], rows: [], leaked: false, error: (e as Error).message };
  }
}
