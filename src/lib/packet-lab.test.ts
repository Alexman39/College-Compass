import { describe, expect, it } from 'vitest';
import {
  PING_REPLY, PING_REQUEST, TCP_CONVERSATION, checkConversation, checksum, fcsOk, fields, fragment, ip, mac, perSecond,
  pingSizes, topTalkers, trafficMinute,
} from './packet-lab';

describe('the book’s ping frames', () => {
  it('are 78 bytes: 14 Ethernet + 60 IP + 4 FCS', () => {
    expect(PING_REQUEST).toHaveLength(78);
    expect(PING_REPLY).toHaveLength(78);
  });
  it('request: IPv4 checksum 0x479B and ICMP checksum 0x2C5C recompute exactly', () => {
    expect(checksum(PING_REQUEST.slice(14, 34), 10)).toBe(0x479b);
    expect(checksum(PING_REQUEST.slice(34, 74), 2)).toBe(0x2c5c);
  });
  it('reply: checksums 0xC89A and 0x345C recompute exactly', () => {
    expect(checksum(PING_REPLY.slice(14, 34), 10)).toBe(0xc89a);
    expect(checksum(PING_REPLY.slice(34, 74), 2)).toBe(0x345c);
  });
  it('both FCS fields are the CRC-32 of the frame', () => {
    expect(fcsOk(PING_REQUEST)).toBe(true);
    expect(fcsOk(PING_REPLY)).toBe(true);
    const broken = [...PING_REQUEST];
    broken[30] = 0;
    expect(fcsOk(broken)).toBe(false);
  });
  it('decode addresses, TTL and types as in the book', () => {
    expect(mac(PING_REQUEST, 0)).toBe('00:D0:06:99:18:28');
    expect(ip(PING_REQUEST, 26)).toBe('155.207.58.4');
    expect(ip(PING_REQUEST, 30)).toBe('155.207.58.100');
    expect(PING_REQUEST[22]).toBe(128);
    expect(PING_REPLY[22]).toBe(255);
    expect([PING_REQUEST[34], PING_REPLY[34]]).toEqual([8, 0]);
  });
  it('the field map covers every byte exactly once, in order', () => {
    const f = fields(PING_REQUEST);
    let at = 0;
    for (const x of f) { expect(x.start).toBe(at); at += x.len; }
    expect(at).toBe(78);
    expect(f.find((x) => x.name === 'Total Length')!.value(PING_REQUEST)).toBe('60 bytes');
  });
});

describe('sizes and fragmentation', () => {
  it('32 bytes of ICMP data: IP total 60, frame 78 with FCS or 74 without', () => {
    expect(pingSizes(32)).toEqual({ ipTotal: 60, frame: 78 });
    expect(pingSizes(32, false).frame).toBe(74);
  });
  it('self-check: 128 bytes of ICMP data → IP total 156', () => {
    expect(pingSizes(128).ipTotal).toBe(156);
  });
  it('worked example: 2.000 bytes over MTU 1.500 → 1.480 + 520, offsets 0 and 185', () => {
    const r = fragment(2000, 1500);
    expect(r).toEqual({ fragments: [
      { index: 0, payload: 1480, totalLength: 1500, offset: 0, mf: 1 },
      { index: 1, payload: 520, totalLength: 540, offset: 185, mf: 0 },
    ] });
  });
  it('DF forbids fragmentation; small packets stay whole', () => {
    expect(fragment(2000, 1500, true)).toEqual({ error: 'df' });
    expect(fragment(100, 1500, true)).toMatchObject({ fragments: [{ totalLength: 120, mf: 0 }] });
  });
  it('payload per non-final fragment is a multiple of 8', () => {
    const r = fragment(5000, 1006) as { fragments: { payload: number; mf: number }[] };
    for (const f of r.fragments.filter((x) => x.mf)) expect(f.payload % 8).toBe(0);
    expect(r.fragments.reduce((a, f) => a + f.payload, 0)).toBe(5000);
  });
});

describe('TCP conversation', () => {
  it('every Seq/Ack follows from the segments before it', () => {
    expect(checkConversation(TCP_CONVERSATION)).toEqual([]);
  });
  it('the cumulative ACK acknowledges two data segments (Ack = 401)', () => {
    const cum = TCP_CONVERSATION.find((s) => s.info === 'Αθροιστική επιβεβαίωση')!;
    expect(cum.ack).toBe(401);
  });
  it('catches a wrong number', () => {
    const bad = TCP_CONVERSATION.map((s, i) => (i === 4 ? { ...s, ack: 100 } : s));
    expect(checkConversation(bad)).toHaveLength(1);
  });
});

describe('traffic', () => {
  it('peaks in the download (20–25 s) and the backup (40–44 s)', () => {
    const s = perSecond(trafficMinute(), 'packets');
    expect(s).toHaveLength(60);
    const peak = Math.max(...s);
    expect(s.indexOf(peak)).toBeGreaterThanOrEqual(20);
    expect(s[42]).toBeGreaterThan(s[10]!);
  });
  it('the biggest talker is the CDN download', () => {
    expect(topTalkers(trafficMinute())[0]!.pair).toBe('203.0.113.50 → 192.168.1.10');
  });
});
