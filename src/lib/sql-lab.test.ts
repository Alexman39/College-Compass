import { describe, expect, it } from 'vitest';
import { DB, runLogin, runQuery, runSearch, tokenize, SqlError } from './sql-lab';

describe('tokenizer', () => {
  it('reads string literals and treats # as a comment to end of line', () => {
    expect(tokenize("x = 'a' # ignored").filter((t) => t.t !== 'op')).toHaveLength(2);
    expect(tokenize("-- whole line")).toHaveLength(0);
  });

  it('handles the doubled-quote escape', () => {
    const toks = tokenize("'it''s'");
    expect(toks).toEqual([{ t: 'str', v: "it's" }]);
  });
});

describe('WHERE precedence (AND binds tighter than OR)', () => {
  it("'1'='1' is always true", () => {
    expect(runQuery("SELECT * FROM users WHERE '1'='1'").rows).toHaveLength(DB.users!.rows.length);
  });

  it('username match AND wrong password OR 1=1 → every row (the injection shape)', () => {
    const q = "SELECT * FROM users WHERE username='admin' AND password='nope' OR '1'='1'";
    expect(runQuery(q).rows).toHaveLength(DB.users!.rows.length);
  });

  it('parentheses change the grouping', () => {
    const q = "SELECT * FROM users WHERE username='admin' AND (password='nope' OR '1'='1')";
    expect(runQuery(q).rows).toHaveLength(1);
  });
});

describe('runQuery: the SELECT playground', () => {
  it('projects named columns', () => {
    const r = runQuery('SELECT name, price FROM products WHERE price > 100');
    expect(r.columns).toEqual(['name', 'price']);
    expect(r.rows.map((x) => x.name)).toEqual(['Οθόνη 24"', 'Οθόνη 27"']);
  });

  it('supports LIKE, ORDER BY and LIMIT', () => {
    const r = runQuery("SELECT name FROM products WHERE category LIKE 'Οθ%' ORDER BY price DESC LIMIT 1");
    expect(r.rows).toEqual([{ name: 'Οθόνη 27"' }]);
  });

  it('rejects an unknown table and an unknown column', () => {
    expect(() => runQuery('SELECT * FROM nope')).toThrow(SqlError);
    expect(() => runQuery('SELECT missing FROM products')).toThrow(SqlError);
  });

  it('a UNION needs a matching column count', () => {
    expect(() => runQuery('SELECT id FROM products UNION SELECT id, name FROM products')).toThrow(/UNION/);
  });
});

describe('login lab: parameterised refuses what vulnerable allows', () => {
  it('both accept the real username and password', () => {
    for (const mode of ['vulnerable', 'safe'] as const) {
      const r = runLogin('admin', 'S3cur3!Pass', mode);
      expect(r.ok, mode).toBe(true);
      expect(r.bypassed, mode).toBe(false);
      expect(r.rows[0]!.username).toBe('admin');
    }
  });

  it('both reject plain wrong credentials', () => {
    expect(runLogin('admin', 'wrong', 'vulnerable').ok).toBe(false);
    expect(runLogin('admin', 'wrong', 'safe').ok).toBe(false);
  });

  it("vulnerable login is bypassed by ' OR '1'='1", () => {
    const r = runLogin("' OR '1'='1", "' OR '1'='1", 'vulnerable');
    expect(r.ok).toBe(true);
    expect(r.bypassed).toBe(true);
    expect(r.rows.length).toBe(DB.users!.rows.length);
  });

  it("vulnerable login is bypassed by ' OR '1'='1' # in the username (comment cuts the password check)", () => {
    const r = runLogin("' OR '1'='1' #", '', 'vulnerable');
    expect(r.ok).toBe(true);
    expect(r.bypassed).toBe(true);
    expect(r.rows.length).toBe(DB.users!.rows.length);
  });

  it("vulnerable login is bypassed by ' OR '1'='1 in the PASSWORD field (OR outranks the AND)", () => {
    const r = runLogin('admin', "' OR '1'='1", 'vulnerable');
    expect(r.ok).toBe(true);
    expect(r.bypassed).toBe(true);
  });

  it("the same ' OR '1'='1 in the username alone does NOT bypass (AND binds tighter)", () => {
    // Teaching point: the classic string only works in the last field or with a comment.
    const r = runLogin("' OR '1'='1", 'wrongpass', 'vulnerable');
    expect(r.ok).toBe(false);
  });

  it("vulnerable login is bypassed by admin'# (comment out the password check)", () => {
    const r = runLogin("admin'#", 'anything', 'vulnerable');
    expect(r.ok).toBe(true);
    expect(r.bypassed).toBe(true);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]!.username).toBe('admin');
  });

  it('the same payloads are inert against the parameterised login', () => {
    expect(runLogin("' OR '1'='1", "' OR '1'='1", 'safe').ok).toBe(false);
    expect(runLogin("admin'#", 'anything', 'safe').ok).toBe(false);
  });

  it('safe mode binds parameters separately, vulnerable inlines them', () => {
    expect(runLogin('admin', 'x', 'safe').query).toContain('?');
    expect(runLogin('admin', 'x', 'safe').params).toEqual(['admin', 'x']);
    expect(runLogin('admin', 'x', 'vulnerable').query).toContain("'admin'");
  });
});

describe('search lab: UNION leaks a forbidden table only when vulnerable', () => {
  const payload = "%' UNION SELECT label, value FROM secrets #";

  it('vulnerable search leaks the secrets table', () => {
    const r = runSearch(payload, 'vulnerable');
    expect(r.error).toBeUndefined();
    expect(r.leaked).toBe(true);
    expect(r.rows.some((x) => String(x.username).includes('DEMO'))).toBe(true);
  });

  it('safe search treats the payload as a harmless search term', () => {
    const r = runSearch(payload, 'safe');
    expect(r.leaked).toBe(false);
    expect(r.rows).toHaveLength(0);
    expect(r.query).toContain('?');
  });

  it('a plain name still searches normally in both modes', () => {
    expect(runSearch('Έλενα', 'vulnerable').rows).toHaveLength(1);
    expect(runSearch('Έλενα', 'safe').rows).toHaveLength(1);
  });
});
