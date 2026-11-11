/**
 * A small UNIX shell for the CN6003 Week 5 lab (src/scripts/demos/sec-terminal.ts):
 * an in-memory file system and the commands of the lecture «Εισαγωγή στο UNIX»
 * (pwd, cd, ls, mkdir, rmdir, cp, mv, rm, cat, echo, head, tail, cut, wc, sort,
 * grep, find, who, date, history, chmod …), with `;`, pipes `|` and the
 * redirections `>`, `>>`, `<`, `>&`. Nothing runs on a real machine. Pure
 * logic; tested in shell-lab.test.ts.
 *
 * Simplifications, said in the lesson: one user (student), no groups to
 * manage. The student owns everything under /home/student and /tmp, so there
 * the owner's bits apply; everything else belongs to root and cannot be
 * changed (Permission denied), as for any non-root user.
 */

export interface FileNode {
  kind: 'file';
  content: string;
  mode: number;
}

export interface DirNode {
  kind: 'dir';
  children: Map<string, Node>;
  mode: number;
}

export type Node = FileNode | DirNode;

export interface Shell {
  root: DirNode;
  cwd: string[];
  history: string[];
}

export const USER = 'student';
export const GROUP = 'cn6003';
export const HOST = 'dias';
/** Fixed, so outputs are reproducible: the lecture date of Week 5. */
export const NOW = 'Fri Nov 20 10:00:00 EET 2026';
const STAMP = 'Nov 20 10:00';

const file = (content: string, mode = 0o644): FileNode => ({ kind: 'file', content, mode });
const dir = (entries: [string, Node][] = [], mode = 0o755): DirNode => ({ kind: 'dir', children: new Map(entries), mode });

/** The lab's home folder: files to search, sort and protect. */
export function newShell(): Shell {
  const home = dir([
    ['users.txt', file(['maria', 'nikos', 'admin', 'eleni', 'kostas', 'backup_admin', 'giorgos'].join('\n') + '\n')],
    ['log.txt', file([
      '09:58 OK    login maria',
      '09:59 ERROR login root (wrong password)',
      '10:00 ERROR login root (wrong password)',
      '10:00 OK    login nikos',
      '10:01 ERROR login root (wrong password)',
      '10:02 OK    logout maria',
    ].join('\n') + '\n')],
    ['scores.txt', file(['eleni\t17\tA', 'nikos\t9\tC', 'maria\t12\tB', 'kostas\t20\tA'].join('\n') + '\n')],
    ['secret.txt', file('Κωδικός Wi-Fi εργαστηρίου: lab-2026\n')],
    ['.profile', file('alias rm rm -i\n')],
    ['notes', dir([['week5.txt', file('Εντολές UNIX: ls, cd, pwd, chmod.\n')]])],
  ]);
  const root = dir([
    ['home', dir([[USER, home]])],
    ['etc', dir([['hosts', file('127.0.0.1 localhost\n192.168.1.1 gateway\n')]])],
    ['tmp', dir([], 0o777)],
  ]);
  return { root, cwd: ['home', USER], history: [] };
}

// ---- paths -------------------------------------------------------------------

export const pwdOf = (sh: Shell) => '/' + sh.cwd.join('/');

function resolve(sh: Shell, path: string): string[] {
  const parts = path === '~' || path.startsWith('~/') ? ['home', USER, ...path.slice(2).split('/')] : path.startsWith('/') ? path.split('/') : [...sh.cwd, ...path.split('/')];
  const out: string[] = [];
  for (const p of parts) {
    if (!p || p === '.') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  return out;
}

function lookup(sh: Shell, parts: string[]): Node | undefined {
  let n: Node = sh.root;
  for (const p of parts) {
    if (n.kind !== 'dir') return undefined;
    const next = n.children.get(p);
    if (!next) return undefined;
    n = next;
  }
  return n;
}

const parentOf = (sh: Shell, parts: string[]) => lookup(sh, parts.slice(0, -1));

/** `*` and `?` in the last part of a path, as on slide 25. */
function glob(sh: Shell, pattern: string): string[] {
  if (!/[*?]/.test(pattern)) return [pattern];
  const slash = pattern.lastIndexOf('/');
  const base = slash >= 0 ? pattern.slice(0, slash + 1) : '';
  const re = new RegExp('^' + pattern.slice(slash + 1).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
  const d = lookup(sh, resolve(sh, base || '.'));
  if (!d || d.kind !== 'dir') return [pattern];
  const hits = [...d.children.keys()].filter((n) => !n.startsWith('.') && re.test(n)).sort();
  return hits.length ? hits.map((n) => base + n) : [pattern];
}

// ---- permissions -------------------------------------------------------------

/** 0o754, dir → «drwxr-xr--». */
export function permString(mode: number, isDir = false): string {
  const bits = 'rwxrwxrwx';
  let s = isDir ? 'd' : '-';
  for (let i = 0; i < 9; i++) s += mode & (1 << (8 - i)) ? bits[i] : '-';
  return s;
}

/**
 * chmod's mode argument: octal («755», «0644») or symbolic, as on slides 85–95
 * («go=r», «u=rwx,g=rx,o=r», «a+x», «u-w», «+x»). Returns the new mode or an
 * error message.
 */
export function applyMode(mode: number, spec: string): number | string {
  if (/^[0-7]{1,4}$/.test(spec)) return parseInt(spec, 8) & 0o777;
  let m = mode;
  for (const clause of spec.split(',')) {
    const c = /^([ugoa]*)([+\-=])([rwx]*)$/.exec(clause);
    if (!c) return `chmod: μη έγκυρη άδεια «${spec}»`;
    const who = c[1] || 'a';
    const perm = (c[3]!.includes('r') ? 4 : 0) | (c[3]!.includes('w') ? 2 : 0) | (c[3]!.includes('x') ? 1 : 0);
    for (const [ch, shift] of [['u', 6], ['g', 3], ['o', 0]] as const) {
      if (!who.includes(ch) && !who.includes('a')) continue;
      const bits = perm << shift;
      if (c[2] === '+') m |= bits;
      else if (c[2] === '-') m &= ~bits;
      else m = (m & ~(7 << shift)) | bits;
    }
  }
  return m;
}

/** «rwxr-xr--» → 754: the octal digits of a 9-character permission string. */
export function octalOf(perm9: string): string {
  let out = '';
  for (let i = 0; i < 9; i += 3) {
    out += String((perm9[i] === 'r' ? 4 : 0) + (perm9[i + 1] === 'w' ? 2 : 0) + (perm9[i + 2] === 'x' ? 1 : 0));
  }
  return out;
}

const canRead = (n: Node) => (n.mode & 0o400) !== 0;
const canWrite = (n: Node) => (n.mode & 0o200) !== 0;

/** Paths the student may change: the home folder and /tmp. The rest is root's. */
const mine = (parts: string[]) => (parts[0] === 'home' && parts[1] === USER) || parts[0] === 'tmp';
const denied = (cmd: string, path: string) => fail(`${cmd}: ${path}: Δεν επιτρέπεται (Permission denied: ανήκει στον root)`);

// ---- command line --------------------------------------------------------------

/** Words, keeping quoted strings together. */
export function tokenize(line: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  for (let m = re.exec(line); m; m = re.exec(line)) out.push(m[1] ?? m[2] ?? m[3]!);
  return out;
}

export interface Result {
  out: string;
  err: string;
}

type Cmd = (sh: Shell, args: string[], stdin: string | null) => Result;
const ok = (out = ''): Result => ({ out, err: '' });
const fail = (err: string): Result => ({ out: '', err });
const lines = (s: string) => (s.endsWith('\n') ? s.slice(0, -1) : s).split('\n');
const joinLines = (xs: string[]) => (xs.length ? xs.join('\n') + '\n' : '');

/** Flags («-la», «-r») and the other arguments, in order. */
function split(args: string[]) {
  const flags = new Set<string>();
  const rest: string[] = [];
  for (const a of args) {
    if (/^-[a-zA-Z]+$/.test(a)) for (const ch of a.slice(1)) flags.add(ch);
    else rest.push(a);
  }
  return { flags, rest };
}

function readInput(sh: Shell, cmd: string, files: string[], stdin: string | null): Result {
  if (!files.length) return ok(stdin ?? '');
  let out = '';
  for (const f of files) {
    const n = lookup(sh, resolve(sh, f));
    if (!n) return fail(`${cmd}: ${f}: Δεν υπάρχει τέτοιο αρχείο ή φάκελος`);
    if (n.kind === 'dir') return fail(`${cmd}: ${f}: Είναι φάκελος`);
    if (!canRead(n)) return fail(`${cmd}: ${f}: Δεν επιτρέπεται η πρόσβαση (Permission denied)`);
    out += n.content;
  }
  return ok(out);
}

function lsLong(name: string, n: Node): string {
  const size = n.kind === 'file' ? new TextEncoder().encode(n.content).length : 4096;
  return `${permString(n.mode, n.kind === 'dir')} 1 ${USER} ${GROUP} ${String(size).padStart(5)} ${STAMP} ${name}`;
}

const COMMANDS: Record<string, Cmd> = {
  pwd: (sh) => ok(pwdOf(sh) + '\n'),

  cd: (sh, args) => {
    const target = args[0] ?? '~';
    const parts = resolve(sh, target);
    const n = lookup(sh, parts);
    if (!n) return fail(`cd: ${target}: Δεν υπάρχει τέτοιος φάκελος`);
    if (n.kind !== 'dir') return fail(`cd: ${target}: Δεν είναι φάκελος`);
    sh.cwd = parts;
    return ok();
  },

  ls: (sh, args) => {
    const { flags, rest } = split(args);
    const targets = rest.length ? rest.flatMap((r) => glob(sh, r)) : ['.'];
    const out: string[] = [];
    const listDir = (path: string, d: DirNode, title: boolean) => {
      if (title) out.push(`${path}:`);
      const names = [...d.children.keys()].filter((n) => flags.has('a') || !n.startsWith('.')).sort();
      if (flags.has('a')) names.unshift('.', '..');
      if (flags.has('l')) out.push(`total ${names.length}`);
      for (const name of names) {
        const n = name === '.' || name === '..' ? d : d.children.get(name)!;
        const shown = flags.has('F') && n.kind === 'dir' && name !== '.' && name !== '..' ? `${name}/` : flags.has('F') && n.kind === 'file' && n.mode & 0o100 ? `${name}*` : name;
        out.push(flags.has('l') ? lsLong(shown, n) : shown);
      }
      if (flags.has('R')) {
        for (const name of names) {
          const n = d.children.get(name);
          if (n?.kind === 'dir' && name !== '.' && name !== '..') {
            out.push('');
            listDir(`${path === '.' ? '.' : path}/${name}`, n, true);
          }
        }
      }
    };
    for (const t of targets) {
      const n = lookup(sh, resolve(sh, t));
      if (!n) return fail(`ls: ${t}: Δεν υπάρχει τέτοιο αρχείο ή φάκελος`);
      if (n.kind === 'file') out.push(flags.has('l') ? lsLong(t, n) : t);
      else listDir(t, n, targets.length > 1 || flags.has('R'));
    }
    return ok(joinLines(out));
  },

  mkdir: (sh, args) => {
    for (const a of args) {
      const parts = resolve(sh, a);
      const parent = parentOf(sh, parts);
      if (!parent || parent.kind !== 'dir') return fail(`mkdir: ${a}: Δεν υπάρχει ο γονικός φάκελος`);
      if (!mine(parts)) return denied('mkdir', a);
      if (parent.children.has(parts.at(-1)!)) return fail(`mkdir: ${a}: Υπάρχει ήδη`);
      parent.children.set(parts.at(-1)!, dir());
    }
    return ok();
  },

  rmdir: (sh, args) => {
    for (const a of args) {
      const parts = resolve(sh, a);
      const n = lookup(sh, parts);
      if (!n) return fail(`rmdir: ${a}: Δεν υπάρχει`);
      if (!mine(parts)) return denied('rmdir', a);
      if (n.kind !== 'dir') return fail(`rmdir: ${a}: Δεν είναι φάκελος`);
      if (n.children.size) return fail(`rmdir: ${a}: Ο φάκελος δεν είναι άδειος`);
      (parentOf(sh, parts) as DirNode).children.delete(parts.at(-1)!);
    }
    return ok();
  },

  cp: (sh, args) => {
    const { flags, rest } = split(args);
    if (rest.length !== 2) return fail('cp: χρήση: cp [-r] πηγή προορισμός');
    const [from, to] = rest as [string, string];
    const src = lookup(sh, resolve(sh, from));
    if (!src) return fail(`cp: ${from}: Δεν υπάρχει`);
    if (src.kind === 'dir' && !flags.has('r')) return fail(`cp: ${from}: Είναι φάκελος (χρειάζεται -r)`);
    if (src.kind === 'file' && !canRead(src)) return fail(`cp: ${from}: Permission denied`);
    let dest = resolve(sh, to);
    const d = lookup(sh, dest);
    if (d?.kind === 'dir') dest = [...dest, resolve(sh, from).at(-1)!];
    const parent = parentOf(sh, dest);
    if (!parent || parent.kind !== 'dir') return fail(`cp: ${to}: Δεν υπάρχει ο φάκελος`);
    if (!mine(dest)) return denied('cp', to);
    parent.children.set(dest.at(-1)!, structuredClone(src));
    return ok();
  },

  mv: (sh, args) => {
    if (args.length !== 2) return fail('mv: χρήση: mv πηγή προορισμός');
    const [from, to] = args as [string, string];
    const fromParts = resolve(sh, from);
    const src = lookup(sh, fromParts);
    if (!src) return fail(`mv: ${from}: Δεν υπάρχει`);
    let dest = resolve(sh, to);
    if (lookup(sh, dest)?.kind === 'dir') dest = [...dest, fromParts.at(-1)!];
    const parent = parentOf(sh, dest);
    if (!parent || parent.kind !== 'dir') return fail(`mv: ${to}: Δεν υπάρχει ο φάκελος`);
    if (!mine(fromParts)) return denied('mv', from);
    if (!mine(dest)) return denied('mv', to);
    (parentOf(sh, fromParts) as DirNode).children.delete(fromParts.at(-1)!);
    parent.children.set(dest.at(-1)!, src);
    return ok();
  },

  rm: (sh, args) => {
    const { flags, rest } = split(args);
    for (const a of rest.flatMap((r) => glob(sh, r))) {
      const parts = resolve(sh, a);
      const n = lookup(sh, parts);
      if (!n) {
        if (flags.has('f')) continue;
        return fail(`rm: ${a}: Δεν υπάρχει`);
      }
      if (n.kind === 'dir' && !flags.has('r')) return fail(`rm: ${a}: Είναι φάκελος (χρειάζεται -r)`);
      if (!mine(parts)) return denied('rm', a);
      (parentOf(sh, parts) as DirNode).children.delete(parts.at(-1)!);
    }
    return ok();
  },

  cat: (sh, args, stdin) => readInput(sh, 'cat', args, stdin),
  more: (sh, args, stdin) => readInput(sh, 'more', args, stdin),

  echo: (_sh, args) => ok(args.join(' ') + '\n'),

  head: (sh, args, stdin) => {
    const n = Number((args.find((a) => /^-\d+$/.test(a)) ?? '-10').slice(1));
    const r = readInput(sh, 'head', args.filter((a) => !/^-\d+$/.test(a)), stdin);
    return r.err ? r : ok(joinLines(lines(r.out).slice(0, n)));
  },

  tail: (sh, args, stdin) => {
    const from = args.find((a) => /^\+\d+$/.test(a));
    const n = Number((args.find((a) => /^-\d+$/.test(a)) ?? '-10').slice(1));
    const r = readInput(sh, 'tail', args.filter((a) => !/^[-+]\d+$/.test(a)), stdin);
    if (r.err) return r;
    const ls = lines(r.out);
    return ok(joinLines(from ? ls.slice(Number(from.slice(1)) - 1) : ls.slice(-n)));
  },

  cut: (sh, args, stdin) => {
    const opt = args.findIndex((a) => a === '-f' || a === '-c');
    if (opt < 0 || !args[opt + 1]) return fail('cut: χρήση: cut -f 2,4 αρχείο ή cut -c 6-9 αρχείο');
    const want = new Set<number>();
    for (const part of args[opt + 1]!.split(',')) {
      const [a, b] = part.split('-').map(Number) as [number, number?];
      for (let i = a; i <= (b ?? a); i++) want.add(i);
    }
    const r = readInput(sh, 'cut', args.filter((_, i) => i !== opt && i !== opt + 1), stdin);
    if (r.err) return r;
    const pick = (xs: string[]) => xs.filter((_, i) => want.has(i + 1));
    return ok(joinLines(lines(r.out).map((l) => (args[opt] === '-f' ? pick(l.split('\t')).join('\t') : pick([...l]).join('')))));
  },

  wc: (sh, args, stdin) => {
    const { flags, rest } = split(args);
    const r = readInput(sh, 'wc', rest, stdin);
    if (r.err) return r;
    const counts = { l: (r.out.match(/\n/g) ?? []).length, w: r.out.split(/\s+/).filter(Boolean).length, c: new TextEncoder().encode(r.out).length };
    const pick = (['l', 'w', 'c'] as const).filter((k) => flags.has(k));
    const shown = (pick.length ? pick : (['l', 'w', 'c'] as const)).map((k) => counts[k]);
    return ok(shown.join(' ') + (rest.length ? ` ${rest[0]}` : '') + '\n');
  },

  sort: (sh, args, stdin) => {
    const o = args.indexOf('-o');
    const outFile = o >= 0 ? args[o + 1] : undefined;
    const { flags, rest } = split(args.filter((_, i) => o < 0 || (i !== o && i !== o + 1)));
    const r = readInput(sh, 'sort', rest, stdin);
    if (r.err) return r;
    const xs = lines(r.out).filter((l, i, all) => l !== '' || i < all.length - 1);
    xs.sort(flags.has('n') ? (a, b) => parseFloat(a) - parseFloat(b) : (a, b) => (a < b ? -1 : a > b ? 1 : 0));
    if (flags.has('r')) xs.reverse();
    if (outFile) return writeFile(sh, outFile, joinLines(xs), false);
    return ok(joinLines(xs));
  },

  grep: (sh, args, stdin) => {
    const { flags, rest } = split(args);
    const [pattern, ...files] = rest;
    if (pattern === undefined) return fail('grep: χρήση: grep [-v -c -n -l -i] μοτίβο [αρχεία]');
    const re = new RegExp(pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&'), flags.has('i') ? 'i' : '');
    const matches = (l: string) => re.test(l) !== flags.has('v');
    const targets = files.flatMap((f) => glob(sh, f));
    if (flags.has('l')) {
      const hits = targets.filter((f) => {
        const n = lookup(sh, resolve(sh, f));
        return n?.kind === 'file' && canRead(n) && lines(n.content).some(matches);
      });
      return ok(joinLines(hits));
    }
    const r = readInput(sh, 'grep', targets, stdin);
    if (r.err) return r;
    const hits: string[] = [];
    lines(r.out).forEach((l, i) => {
      if (l !== '' && matches(l)) hits.push(flags.has('n') ? `${i + 1}:${l}` : l);
    });
    return ok(flags.has('c') ? `${hits.length}\n` : joinLines(hits));
  },

  find: (sh, args) => {
    const name = args[args.indexOf('-name') + 1] ?? args.at(-1);
    if (!name) return fail('find: χρήση: find . -name «όνομα»');
    const re = new RegExp('^' + name.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    const out: string[] = [];
    const walk = (d: DirNode, path: string) => {
      for (const [n, c] of [...d.children].sort(([a], [b]) => (a < b ? -1 : 1))) {
        if (re.test(n)) out.push(`${path}/${n}`);
        if (c.kind === 'dir') walk(c, `${path}/${n}`);
      }
    };
    walk(lookup(sh, sh.cwd) as DirNode, '.');
    return ok(joinLines(out));
  },

  who: (_sh, args) => ok(args.join(' ') === 'am i' ? `${USER}   pts/0    ${STAMP}\n` : `${USER}   pts/0    ${STAMP}\nmaria     pts/1    Nov 20 09:58\nnikos     pts/2    Nov 20 10:00\n`),
  whoami: () => ok(`${USER}\n`),
  date: () => ok(`${NOW}\n`),
  history: (sh) => ok(joinLines(sh.history.map((c, i) => `${String(i + 1).padStart(4)}  ${c}`))),

  chmod: (sh, args) => {
    const [spec, ...targets] = args;
    if (!spec || !targets.length) return fail('chmod: χρήση: chmod 640 αρχείο ή chmod go=r αρχείο');
    for (const t of targets.flatMap((x) => glob(sh, x))) {
      const parts = resolve(sh, t);
      const n = lookup(sh, parts);
      if (!n) return fail(`chmod: ${t}: Δεν υπάρχει`);
      if (!mine(parts)) return denied('chmod', t);
      const m = applyMode(n.mode, spec);
      if (typeof m === 'string') return fail(m);
      n.mode = m;
    }
    return ok();
  },

  man: (_sh, args) => ok(args[0] && MAN[args[0]] ? `${args[0]}: ${MAN[args[0]]}\n` : `man: δεν υπάρχει σελίδα για «${args[0] ?? ''}». Δοκίμασε: ${Object.keys(MAN).join(', ')}\n`),
};

const MAN: Record<string, string> = {
  ls: 'λίστα αρχείων. -l αναλυτικά, -a και κρυφά, -F σημάδια (/ φάκελος, * εκτελέσιμο), -R αναδρομικά.',
  cd: 'αλλαγή φακέλου. cd .. ένα επίπεδο πάνω, cd / στη ρίζα, cd σκέτο στον αρχικό φάκελο.',
  chmod: 'αλλαγή δικαιωμάτων. Οκταδικά (chmod 640 f) ή συμβολικά (chmod go=r f, chmod u+x f).',
  grep: 'γραμμές που ταιριάζουν. -v όσες δεν ταιριάζουν, -c πλήθος, -n με αριθμό γραμμής, -l μόνο ονόματα αρχείων, -i χωρίς διάκριση κεφαλαίων.',
  sort: 'ταξινόμηση. -r φθίνουσα, -n αριθμητική, -o αρχείο εξόδου. Δεν αλλάζει το αρχικό αρχείο.',
  wc: 'μέτρηση γραμμών (-l), λέξεων (-w), χαρακτήρων (-c).',
  rm: 'διαγραφή. -r φάκελος με το περιεχόμενό του, -i με επιβεβαίωση, -f χωρίς μηνύματα.',
  cut: 'στήλες (-f, χωρισμένες με TAB) ή χαρακτήρες (-c) κάθε γραμμής.',
};

export const COMMAND_NAMES = Object.keys(COMMANDS).sort();

function writeFile(sh: Shell, path: string, text: string, append: boolean): Result {
  const parts = resolve(sh, path);
  const parent = parentOf(sh, parts);
  if (!parent || parent.kind !== 'dir') return fail(`${path}: Δεν υπάρχει ο φάκελος`);
  if (!mine(parts)) return fail(`${path}: Δεν επιτρέπεται η εγγραφή (Permission denied: ανήκει στον root)`);
  const existing = parent.children.get(parts.at(-1)!);
  if (existing?.kind === 'dir') return fail(`${path}: Είναι φάκελος`);
  if (existing && !canWrite(existing)) return fail(`${path}: Δεν επιτρέπεται η εγγραφή (Permission denied)`);
  if (existing) existing.content = append ? existing.content + text : text;
  else parent.children.set(parts.at(-1)!, file(text));
  return ok();
}

/** One simple command with its redirections; `stdin` comes from a pipe. */
function runSimple(sh: Shell, words: string[], stdin: string | null): Result {
  let input = stdin;
  let outTo: { path: string; append: boolean; both: boolean } | null = null;
  const argv: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    if (w === '>' || w === '>>' || w === '>&' || w === '>>&') {
      const path = words[++i];
      if (!path) return fail('Λείπει το αρχείο μετά το ' + w);
      outTo = { path, append: w.startsWith('>>'), both: w.endsWith('&') };
    } else if (w === '<') {
      const path = words[++i];
      if (!path) return fail('Λείπει το αρχείο μετά το <');
      const r = readInput(sh, '<', [path], null);
      if (r.err) return r;
      input = r.out;
    } else argv.push(w);
  }
  const [name, ...args] = argv;
  if (!name) return ok();
  const cmd = COMMANDS[name];
  const res = cmd ? cmd(sh, args.flatMap((a) => (name === 'find' || name === 'grep' && a === args[0] ? [a] : glob(sh, a))), input) : fail(`${name}: Δεν βρέθηκε η εντολή. Γράψε help για τη λίστα.`);
  if (!outTo) return res;
  const text = res.out + (outTo.both ? (res.err ? res.err + '\n' : '') : '');
  const w = writeFile(sh, outTo.path, text, outTo.append);
  return w.err ? w : { out: '', err: outTo.both ? '' : res.err };
}

/** A whole line: commands separated by `;`, each possibly a pipeline. */
export function run(sh: Shell, line: string): Result {
  const trimmed = line.trim();
  if (!trimmed) return ok();
  sh.history.push(trimmed);
  if (trimmed === 'help') return ok(`Εντολές: ${COMMAND_NAMES.join(', ')}.\nΑνακατευθύνσεις: >, >>, <, >&· σωλήνωση: |· πολλές εντολές: ;\n`);
  let out = '';
  let err = '';
  for (const part of trimmed.split(';')) {
    const stages = part.split('|').map((p) => tokenize(p));
    let pipe: string | null = null;
    let r: Result = ok();
    for (const [i, words] of stages.entries()) {
      r = runSimple(sh, words, i === 0 ? null : pipe ?? '');
      if (r.err) break;
      pipe = r.out;
    }
    out += r.out;
    if (r.err) err += (err ? '\n' : '') + r.err;
  }
  return { out, err };
}

export function prompt(sh: Shell): string {
  const p = pwdOf(sh);
  const home = `/home/${USER}`;
  return `${HOST}:${p === home ? '~' : p.startsWith(home + '/') ? '~' + p.slice(home.length) : p}% `;
}

// ---- missions -----------------------------------------------------------------

export interface Mission {
  id: string;
  task: string;
  hint: string;
  /** Checked after every command, with that command's line and output. */
  done: (sh: Shell, line: string, out: string) => boolean;
}

const at = (sh: Shell, path: string) => lookup(sh, resolve(sh, path));

export const MISSIONS: Mission[] = [
  {
    id: 'mkdir',
    task: 'Φτιάξε τον φάκελο informatics και μέσα του τον υποφάκελο cs1.',
    hint: 'mkdir informatics, μετά mkdir informatics/cs1',
    done: (sh) => at(sh, `/home/${USER}/informatics/cs1`)?.kind === 'dir',
  },
  {
    id: 'grep-count',
    task: 'Πόσες αποτυχημένες συνδέσεις (ERROR) έχει το log.txt; Βγάλε τον αριθμό με μία εντολή.',
    hint: 'grep -c ERROR log.txt',
    done: (_sh, _line, out) => out.trim() === '3',
  },
  {
    id: 'sort-redirect',
    task: 'Αποθήκευσε τα ονόματα του users.txt αλφαβητικά ταξινομημένα στο νέο αρχείο sorted.txt.',
    hint: 'sort users.txt > sorted.txt',
    done: (sh) => {
      const n = at(sh, `/home/${USER}/sorted.txt`);
      return n?.kind === 'file' && n.content === joinLines(lines((at(sh, `/home/${USER}/users.txt`) as FileNode).content).sort());
    },
  },
  {
    id: 'pipe',
    task: 'Με σωλήνωση: πόσοι λογαριασμοί στο users.txt περιέχουν τη λέξη admin;',
    hint: 'cat users.txt | grep admin | wc -l',
    done: (_sh, line, out) => line.includes('|') && out.trim().split(/\s+/)[0] === '2',
  },
  {
    id: 'chmod',
    task: 'Το secret.txt έχει τον κωδικό του Wi-Fi. Κάν’ το να το διαβάζει και να το γράφει μόνο ο ιδιοκτήτης (rw-------).',
    hint: 'chmod 600 secret.txt  ή  chmod go= secret.txt',
    done: (sh) => (at(sh, `/home/${USER}/secret.txt`) as FileNode | undefined)?.mode === 0o600,
  },
  {
    id: 'readonly',
    task: 'Κάνε το users.txt μόνο για ανάγνωση από όλους (r--r--r--) και δοκίμασε να γράψεις σε αυτό με echo … >> users.txt.',
    hint: 'chmod 444 users.txt, μετά echo test >> users.txt',
    done: (sh, line) => (at(sh, `/home/${USER}/users.txt`) as FileNode | undefined)?.mode === 0o444 && /echo .*>>?\s*users\.txt/.test(line),
  },
];
