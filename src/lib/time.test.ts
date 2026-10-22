import { describe, expect, it, vi } from 'vitest';
import { athensWallTime, isLocalDate, parseAthensDateTime } from './time';

// Run as if the machine were in New York, so the tests prove the results
// don't depend on the computer's own time zone (GitHub Actions uses UTC,
// a laptop might use anything). Node applies TZ changes immediately.
vi.stubEnv('TZ', 'America/New_York');

/** Parse and return the UTC ISO string, failing the test on errors. */
function utc(local: string): string {
  const r = parseAthensDateTime(local);
  if (!r.ok) throw new Error(r.reason);
  return r.date.toISOString();
}

describe('parseAthensDateTime — ordinary days', () => {
  it('winter time is UTC+2', () => {
    expect(utc('2026-01-15T23:59')).toBe('2026-01-15T21:59:00.000Z');
  });

  it('summer time is UTC+3', () => {
    expect(utc('2026-07-01T12:00')).toBe('2026-07-01T09:00:00.000Z');
  });

  it('a late-evening deadline can fall on the previous UTC day', () => {
    expect(utc('2026-06-01T01:30')).toBe('2026-05-31T22:30:00.000Z');
  });
});

describe('parseAthensDateTime — spring forward, 2026-03-29', () => {
  // 03:00 EET (+02) jumps straight to 04:00 EEST (+03), at 01:00 UTC.

  it('just before the switch is still +2', () => {
    expect(utc('2026-03-29T02:59')).toBe('2026-03-29T00:59:00.000Z');
  });

  it('03:30 does not exist that night and is rejected with a clear reason', () => {
    const r = parseAthensDateTime('2026-03-29T03:30');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/does not exist/);
  });

  it('04:00 is the first valid minute after the switch, now +3', () => {
    expect(utc('2026-03-29T04:00')).toBe('2026-03-29T01:00:00.000Z');
  });

  it('the evening after the switch is +3', () => {
    expect(utc('2026-03-29T23:59')).toBe('2026-03-29T20:59:00.000Z');
  });
});

describe('parseAthensDateTime — fall back, 2026-10-25', () => {
  // 04:00 EEST (+03) goes back to 03:00 EET (+02), at 01:00 UTC, so
  // 03:00–03:59 happens twice. We pick the earlier one.

  it('just before the overlap is +3', () => {
    expect(utc('2026-10-25T02:59')).toBe('2026-10-24T23:59:00.000Z');
  });

  it('03:30 (happens twice) resolves to the earlier, summer-time occurrence', () => {
    expect(utc('2026-10-25T03:30')).toBe('2026-10-25T00:30:00.000Z');
  });

  it('04:00 is after the overlap, now +2', () => {
    expect(utc('2026-10-25T04:00')).toBe('2026-10-25T02:00:00.000Z');
  });

  it('the evening after the switch is +2', () => {
    expect(utc('2026-10-25T23:59')).toBe('2026-10-25T21:59:00.000Z');
  });
});

describe('parseAthensDateTime — invalid input', () => {
  it.each([
    ['2026-02-30T10:00', /not a real date/],
    ['2026-03-14T24:00', /not a real date/],
    ['2026-03-14T23:60', /not a real date/],
    ['2026-03-14 23:59', /not in the form/],
    ['2026-03-14T23:59:00', /not in the form/],
    ['14/03/2026 23:59', /not in the form/],
  ])('%s is rejected', (input, reason) => {
    const r = parseAthensDateTime(input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(reason);
  });
});

describe('athensWallTime', () => {
  it('round-trips a parsed time back to the same wall clock', () => {
    const r = parseAthensDateTime('2026-11-20T09:10');
    expect(r.ok).toBe(true);
    if (r.ok) expect(athensWallTime(r.date)).toMatchObject({ year: 2026, month: 11, day: 20, hour: 9, minute: 10 });
  });
});

describe('isLocalDate', () => {
  it('accepts real dates, including leap days', () => {
    expect(isLocalDate('2028-02-29')).toBe(true);
    expect(isLocalDate('2026-10-07')).toBe(true);
  });

  it('rejects impossible or malformed dates', () => {
    expect(isLocalDate('2027-02-29')).toBe(false);
    expect(isLocalDate('2026-13-01')).toBe(false);
    expect(isLocalDate('2026-1-7')).toBe(false);
  });
});
