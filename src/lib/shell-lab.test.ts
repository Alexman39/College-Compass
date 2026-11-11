import { describe, expect, it } from 'vitest';
import { MISSIONS, applyMode, newShell, octalOf, permString, prompt, run, tokenize } from './shell-lab';

const sh = () => newShell();
const out = (s: ReturnType<typeof newShell>, line: string) => run(s, line).out;

describe('UNIX shell lab', () => {
  it('pwd, cd and the prompt follow the working folder', () => {
    const s = sh();
    expect(out(s, 'pwd')).toBe('/home/student\n');
    expect(prompt(s)).toBe('dias:~% ');
    run(s, 'cd notes');
    expect(out(s, 'pwd')).toBe('/home/student/notes\n');
    run(s, 'cd ..');
    run(s, 'cd /');
    expect(prompt(s)).toBe('dias:/% ');
    run(s, 'cd');
    expect(out(s, 'pwd')).toBe('/home/student\n');
    expect(run(s, 'cd nowhere').err).toMatch(/Δεν υπάρχει/);
  });

  it('ls hides dot files unless -a, marks folders with -F, and -l shows permissions', () => {
    const s = sh();
    expect(out(s, 'ls')).not.toContain('.profile');
    expect(out(s, 'ls -a')).toContain('.profile');
    expect(out(s, 'ls -F')).toContain('notes/');
    expect(out(s, 'ls -l')).toMatch(/^-rw-r--r-- 1 student cn6003 .* secret\.txt$/m);
    expect(out(s, 'ls -l')).toMatch(/^drwxr-xr-x .* notes$/m);
  });

  it('mkdir, cp -r, mv and rmdir work as on slides 32–35', () => {
    const s = sh();
    run(s, 'mkdir cs1 cs2');
    run(s, 'mkdir cs1/deep');
    expect(run(s, 'rmdir cs1').err).toMatch(/δεν είναι άδειος/);
    run(s, 'cp -r cs1 cs3');
    expect(out(s, 'ls cs3')).toBe('deep\n');
    run(s, 'mv cs3 cs2');
    expect(out(s, 'ls cs2')).toBe('cs3\n');
    run(s, 'rmdir cs1/deep');
    run(s, 'rmdir cs1');
    expect(out(s, 'ls')).not.toMatch(/^cs1$/m);
    expect(run(s, 'cp cs2 x').err).toMatch(/-r/);
  });

  it('head, tail, wc, sort and grep', () => {
    const s = sh();
    expect(out(s, 'head -2 users.txt')).toBe('maria\nnikos\n');
    expect(out(s, 'tail -1 users.txt')).toBe('giorgos\n');
    expect(out(s, 'tail +6 users.txt')).toBe('backup_admin\ngiorgos\n');
    expect(out(s, 'wc -l users.txt')).toBe('7 users.txt\n');
    expect(out(s, 'sort users.txt').split('\n')[0]).toBe('admin');
    expect(out(s, 'sort -r users.txt').split('\n')[0]).toBe('nikos');
    expect(out(s, 'grep -c ERROR log.txt')).toBe('3\n');
    expect(out(s, 'grep -v ERROR log.txt').split('\n').filter(Boolean)).toHaveLength(3);
    expect(out(s, 'grep -n admin users.txt')).toBe('3:admin\n6:backup_admin\n');
    expect(out(s, 'grep -l root *')).toBe('log.txt\n');
  });

  it('sort -n sorts numbers, and cut picks TAB columns or characters', () => {
    const s = sh();
    expect(out(s, 'cut -f 2 scores.txt | sort -n')).toBe('9\n12\n17\n20\n');
    expect(out(s, 'cut -f 1,3 scores.txt').split('\n')[0]).toBe('eleni\tA');
    expect(out(s, 'cut -c 1-3 users.txt').split('\n')[0]).toBe('mar');
  });

  it('redirections: > replaces, >> appends, < reads, >& keeps the error message', () => {
    const s = sh();
    run(s, 'echo one > f');
    run(s, 'echo two >> f');
    expect(out(s, 'cat f')).toBe('one\ntwo\n');
    run(s, 'echo three > f');
    expect(out(s, 'cat < f')).toBe('three\n');
    run(s, 'cat missing >& java.err');
    expect(out(s, 'cat java.err')).toMatch(/missing/);
    run(s, 'cat < f > backup');
    expect(out(s, 'cat backup')).toBe('three\n');
    run(s, 'pwd >> info; who am i >> info');
    expect(out(s, 'cat info')).toMatch(/^\/home\/student\nstudent /);
  });

  it('pipes: who | wc -l and who | sort', () => {
    const s = sh();
    expect(out(s, 'who | wc -l')).toBe('3\n');
    expect(out(s, 'who | sort').split('\n')[0]).toMatch(/^maria/);
    expect(out(s, 'ls | wc -l')).toBe('5\n');
  });

  it('chmod on the lecture examples (slides 88–95)', () => {
    expect(permString(applyMode(0o555, 'go=r') as number)).toBe('-r-xr--r--');
    expect(permString(applyMode(0o444, 'u=rwx,g=rx,o=r') as number)).toBe('-rwxr-xr--');
    for (const [oct, perm] of [['400', '-r--------'], ['600', '-rw-------'], ['700', '-rwx------'], ['444', '-r--r--r--'], ['666', '-rw-rw-rw-'], ['777', '-rwxrwxrwx']]) {
      expect(permString(applyMode(0o644, oct!) as number)).toBe(perm);
    }
    expect(applyMode(0o644, 'a+x')).toBe(0o755);
    expect(applyMode(0o755, 'u-w')).toBe(0o555);
    expect(applyMode(0o644, '+x')).toBe(0o755);
    expect(applyMode(0o644, 'go=')).toBe(0o600);
    expect(typeof applyMode(0o644, 'q+z')).toBe('string');
    expect(octalOf('rwxr-xr--')).toBe('754');
    expect(octalOf('r-x------')).toBe('500');
  });

  it('permissions are enforced: no read → cat fails, no write → > fails', () => {
    const s = sh();
    run(s, 'chmod 200 secret.txt');
    expect(run(s, 'cat secret.txt').err).toMatch(/Permission denied/);
    run(s, 'chmod 444 users.txt');
    expect(run(s, 'echo x >> users.txt').err).toMatch(/Permission denied/);
    run(s, 'chmod u+w users.txt');
    expect(run(s, 'echo x >> users.txt').err).toBe('');
  });

  it('outside the home folder and /tmp everything is root\'s: no writes, no deletes, no chmod', () => {
    const s = sh();
    expect(run(s, 'echo hi > /etc/x').err).toMatch(/Permission denied/);
    expect(run(s, 'rm /etc/hosts').err).toMatch(/Permission denied/);
    expect(run(s, 'chmod 777 /etc/hosts').err).toMatch(/Permission denied/);
    expect(run(s, 'mkdir /etc/new').err).toMatch(/Permission denied/);
    expect(run(s, 'cp users.txt /etc').err).toMatch(/Permission denied/);
    expect(out(s, 'cat /etc/hosts')).toMatch(/gateway/);
    expect(run(s, 'echo ok > /tmp/x').err).toBe('');
    expect(run(s, 'cp /etc/hosts .').err).toBe('');
  });

  it('history numbers every command; unknown commands say so', () => {
    const s = sh();
    run(s, 'pwd');
    run(s, 'ls');
    expect(out(s, 'history')).toBe('   1  pwd\n   2  ls\n   3  history\n');
    expect(run(s, 'format c:').err).toMatch(/Δεν βρέθηκε/);
    expect(tokenize('echo "δύο λέξεις" > f')).toEqual(['echo', 'δύο λέξεις', '>', 'f']);
  });

  it('every mission can be completed with its hint', () => {
    for (const m of MISSIONS) {
      const s = sh();
      let done = false;
      for (const line of m.hint.split(/, μετά |  ή  /).slice(0, m.id === 'chmod' ? 1 : undefined)) {
        const r = run(s, line);
        done ||= m.done(s, line, r.out);
      }
      expect(done, m.id).toBe(true);
    }
  });
});
