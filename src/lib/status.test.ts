import { describe, expect, it } from 'vitest';
import { statusLabel, timeStatus } from './status';

const d = (iso: string) => new Date(iso);
const due = d('2026-11-20T21:59:00Z'); // 23:59 Athens

describe('timeStatus', () => {
  it('is locked before release', () => {
    expect(timeStatus({ released: d('2026-11-01T08:00:00Z'), due }, d('2026-10-31T12:00:00Z'))).toBe('locked');
  });

  it('is open when released and the deadline is more than 72h away', () => {
    expect(timeStatus({ due }, d('2026-11-17T21:58:00Z'))).toBe('open');
  });

  it('is soon exactly 72h before and up to the deadline', () => {
    expect(timeStatus({ due }, d('2026-11-17T21:59:00Z'))).toBe('soon');
    expect(timeStatus({ due }, due)).toBe('soon');
  });

  it('is overdue one millisecond after the deadline', () => {
    expect(timeStatus({ due }, new Date(due.getTime() + 1))).toBe('overdue');
  });

  it('practice without a deadline is open once released', () => {
    expect(timeStatus({}, d('2030-01-01T00:00:00Z'))).toBe('open');
  });
});

describe('statusLabel', () => {
  it('counts hours when due within two days', () => {
    expect(statusLabel('soon', { due }, d('2026-11-20T07:59:00Z'))).toBe('Λήγει σε 14 ώρες');
  });

  it('counts days further out', () => {
    expect(statusLabel('soon', { due }, d('2026-11-17T22:00:00Z'))).toBe('Λήγει σε 3 ημέρες');
  });

  it('says when a locked item opens', () => {
    expect(statusLabel('locked', { released: d('2026-11-01T08:00:00Z') }, d('2026-10-31T08:00:00Z'))).toBe(
      'Ανοίγει σε 24 ώρες',
    );
  });

  it('uses the default label otherwise', () => {
    expect(statusLabel('overdue', { due }, d('2026-12-01T00:00:00Z'))).toBeUndefined();
  });
});
