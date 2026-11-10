/**
 * Data and arithmetic for the CN6003 Week 4 labs (Packet Anatomy, IPv4
 * fragmentation, TCP conversation timeline, network traffic explorer).
 *
 * The two ping frames are the book's (Χειλάς, Πολίτης, Βακαλούδη, ch. 3,
 * §4.1–4.2), byte for byte; the tests recompute both checksums and the
 * Ethernet CRC. The TCP conversation and the traffic are synthetic teaching
 * data with private addresses, not real captures.
 */

export const hex = (s: string) => s.replace(/\s+/g, '').match(/../g)!.map((b) => parseInt(b, 16));

/** ICMP echo request, book §4.1 (78 bytes with the 4-byte FCS). */
export const PING_REQUEST = hex(`
  00 d0 06 99 18 28 00 02 b3 0b 86 15 08 00 45 00
  00 3c 47 1f 00 00 80 01 47 9b 9b cf 3a 04 9b cf
  3a 64 08 00 2c 5c 02 00 1f 00 61 62 63 64 65 66
  67 68 69 6a 6b 6c 6d 6e 6f 70 71 72 73 74 75 76
  77 61 62 63 64 65 66 67 68 69 97 17 06 dc`);

/** ICMP echo reply, book §4.2. */
export const PING_REPLY = hex(`
  00 02 b3 0b 86 15 00 d0 06 99 18 28 08 00 45 00
  00 3c 47 1f 00 00 ff 01 c8 9a 9b cf 3a 64 9b cf
  3a 04 00 00 34 5c 02 00 1f 00 61 62 63 64 65 66
  67 68 69 6a 6b 6c 6d 6e 6f 70 71 72 73 74 75 76
  77 61 62 63 64 65 66 67 68 69 8e ea 2b 04`);

export type Layer = 'Ethernet' | 'IPv4' | 'ICMP' | 'Δεδομένα' | 'FCS';

export interface Field {
  layer: Layer;
  name: string;
  start: number;
  /** Length in bytes. Bit fields share a byte range and give `bits`. */
  len: number;
  bits?: string;
  value: (b: number[]) => string;
  explain: string;
}

const h2 = (b: number[], s: number, n: number) => b.slice(s, s + n).map((x) => x.toString(16).padStart(2, '0')).join(' ');
const u16 = (b: number[], s: number) => (b[s]! << 8) | b[s + 1]!;
export const mac = (b: number[], s: number) => b.slice(s, s + 6).map((x) => x.toString(16).padStart(2, '0').toUpperCase()).join(':');
export const ip = (b: number[], s: number) => b.slice(s, s + 4).join('.');

const ICMP_TYPES: Record<number, string> = { 0: 'Echo reply', 3: 'Destination unreachable', 8: 'Echo request', 11: 'Time exceeded' };

/** The field map of an Ethernet II + IPv4 (no options) + ICMP echo frame. */
export function fields(frame: number[]): Field[] {
  const end = frame.length - 4;
  return [
    { layer: 'Ethernet', name: 'MAC παραλήπτη', start: 0, len: 6, value: (b) => mac(b, 0), explain: 'Η κάρτα δικτύου δέχεται το πλαίσιο αν αυτή είναι η δική της MAC (unicast), ή broadcast/multicast.' },
    { layer: 'Ethernet', name: 'MAC αποστολέα', start: 6, len: 6, value: (b) => mac(b, 6), explain: 'Η κάρτα που έστειλε το πλαίσιο, στο τοπικό δίκτυο.' },
    { layer: 'Ethernet', name: 'EtherType', start: 12, len: 2, value: (b) => `0x${h2(b, 12, 2).replace(' ', '')}${u16(b, 12) === 0x0800 ? ' = IPv4' : ''}`, explain: 'Σε ποιο πρωτόκολλο παραδίδεται το περιεχόμενο: 0x0800 IPv4, 0x0806 ARP, 0x86DD IPv6.' },
    { layer: 'IPv4', name: 'Version · IHL', start: 14, len: 1, value: (b) => `${b[14]! >> 4} · ${b[14]! & 15} → ${(b[14]! & 15) * 4} bytes`, explain: 'Το byte 0x45 είναι δύο τετράδες bit: 4 = IPv4, 5 = μήκος επικεφαλίδας σε λέξεις των 4 bytes, άρα 5 × 4 = 20 bytes.' },
    { layer: 'IPv4', name: 'DSCP / ECN', start: 15, len: 1, value: (b) => `0x${h2(b, 15, 1)}`, explain: 'Χειρισμός κίνησης και συμφόρησης (παλαιότερα ToS)· 0 = κανονική υπηρεσία.' },
    { layer: 'IPv4', name: 'Total Length', start: 16, len: 2, value: (b) => `${u16(b, 16)} bytes`, explain: 'Επικεφαλίδα IPv4 + payload, σε bytes. Δεν περιλαμβάνει την επικεφαλίδα Ethernet ούτε το FCS: 20 + 8 + 32 = 60.' },
    { layer: 'IPv4', name: 'Identification', start: 18, len: 2, value: (b) => `0x${h2(b, 18, 2).replace(' ', '')}`, explain: 'Όλα τα fragments του ίδιου datagram έχουν την ίδια τιμή.' },
    { layer: 'IPv4', name: 'Flags · Fragment Offset', start: 20, len: 2, value: (b) => { const v = u16(b, 20); return `DF = ${(v >> 14) & 1}, MF = ${(v >> 13) & 1}, offset = ${v & 0x1fff}`; }, explain: '3 bit flags (DF: μη κατακερματισμός, MF: ακολουθούν κι άλλα fragments) και 13 bit offset, σε μονάδες των 8 bytes.' },
    { layer: 'IPv4', name: 'TTL', start: 22, len: 1, value: (b) => String(b[22]), explain: 'Μειώνεται κατά 1 σε κάθε δρομολογητή· στο 0 το πακέτο απορρίπτεται. Τα Windows ξεκινούν από 128, πολλές δικτυακές συσκευές από 255.' },
    { layer: 'IPv4', name: 'Protocol', start: 23, len: 1, value: (b) => `${b[23]}${b[23] === 1 ? ' = ICMP' : b[23] === 6 ? ' = TCP' : b[23] === 17 ? ' = UDP' : ''}`, explain: 'Σε ποιο πρωτόκολλο ανήκει το payload: 1 ICMP, 6 TCP, 17 UDP.' },
    { layer: 'IPv4', name: 'Header Checksum', start: 24, len: 2, value: (b) => `0x${h2(b, 24, 2).replace(' ', '').toUpperCase()} ${checksum(b.slice(14, 34), 10) === u16(b, 24) ? '(σωστό)' : '(λάθος)'}`, explain: 'Συμπλήρωμα ως προς 1 (one’s complement) του αθροίσματος των λέξεων των 16 bit, μόνο της επικεφαλίδας IPv4.' },
    { layer: 'IPv4', name: 'Source Address', start: 26, len: 4, value: (b) => ip(b, 26), explain: 'Η IP του αποστολέα: 32 bit, κάθε byte ένας αριθμός 0–255.' },
    { layer: 'IPv4', name: 'Destination Address', start: 30, len: 4, value: (b) => ip(b, 30), explain: 'Η IP του παραλήπτη: 32 bit.' },
    { layer: 'ICMP', name: 'Type · Code', start: 34, len: 2, value: (b) => `${b[34]} (${ICMP_TYPES[b[34]!] ?? '—'}) · ${b[35]}`, explain: '8 = Echo request, 0 = Echo reply.' },
    { layer: 'ICMP', name: 'Checksum', start: 36, len: 2, value: (b) => `0x${h2(b, 36, 2).replace(' ', '').toUpperCase()} ${checksum(b.slice(34, end), 2) === u16(b, 36) ? '(σωστό)' : '(λάθος)'}`, explain: 'Ίδιος αλγόριθμος με το IPv4, πάνω σε όλο το μήνυμα ICMP (επικεφαλίδα και δεδομένα).' },
    { layer: 'ICMP', name: 'Identifier', start: 38, len: 2, value: (b) => String(u16(b, 38)), explain: 'Μαζί με το Sequence, ταιριάζει το reply με το request.' },
    { layer: 'ICMP', name: 'Sequence', start: 40, len: 2, value: (b) => String(u16(b, 40)), explain: 'Αύξων αριθμός του αιτήματος· το reply έχει τον ίδιο.' },
    { layer: 'Δεδομένα', name: 'Δεδομένα ICMP', start: 42, len: end - 42, value: (b) => `${end - 42} bytes «${String.fromCharCode(...b.slice(42, end))}»`, explain: 'Το περιεχόμενο που στέλνει το ping των Windows: το αλφάβητο, 32 bytes.' },
    { layer: 'FCS', name: 'FCS (CRC-32)', start: end, len: 4, value: (b) => `${h2(b, end, 4)} ${fcsOk(b) ? '(σωστό)' : '(λάθος)'}`, explain: 'Έλεγχος σφαλμάτων του πλαισίου. Σε πολλές καταγραφές Wireshark δεν εμφανίζεται, γιατί η κάρτα ή ο οδηγός το αφαιρεί πριν από τη σύλληψη.' },
  ];
}

/** Internet checksum (RFC 1071) with the checksum field at `at` zeroed. */
export function checksum(bytes: number[], at: number): number {
  const b = [...bytes];
  b[at] = 0; b[at + 1] = 0;
  let s = 0;
  for (let i = 0; i < b.length; i += 2) s += (b[i]! << 8) + (b[i + 1] ?? 0);
  while (s >> 16) s = (s & 0xffff) + (s >> 16);
  return ~s & 0xffff;
}

export function crc32(bytes: number[]): number {
  let c = 0xffffffff;
  for (const x of bytes) {
    c ^= x;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** The FCS travels least significant byte first. */
export function fcsOk(frame: number[]): boolean {
  const n = frame.length - 4;
  const fcs = frame[n]! | (frame[n + 1]! << 8) | (frame[n + 2]! << 16) | (frame[n + 3]! << 24);
  return crc32(frame.slice(0, n)) === fcs >>> 0;
}

// ---- sizes and fragmentation ----

export function pingSizes(icmpData: number, fcs = true) {
  const ipTotal = 20 + 8 + icmpData;
  return { ipTotal, frame: 14 + ipTotal + (fcs ? 4 : 0) };
}

export interface Fragment { index: number; payload: number; totalLength: number; offset: number; mf: 0 | 1 }

/** IPv4 fragmentation of `payload` bytes over a link MTU (20-byte header, no options). */
export function fragment(payload: number, mtu: number, df = false): { fragments: Fragment[] } | { error: 'df' | 'mtu' } {
  if (mtu < 68) return { error: 'mtu' };
  if (payload + 20 <= mtu) return { fragments: [{ index: 0, payload, totalLength: payload + 20, offset: 0, mf: 0 }] };
  if (df) return { error: 'df' };
  const max = Math.floor((mtu - 20) / 8) * 8;
  const out: Fragment[] = [];
  for (let done = 0, i = 0; done < payload; i++) {
    const p = Math.min(max, payload - done);
    out.push({ index: i, payload: p, totalLength: p + 20, offset: done / 8, mf: done + p < payload ? 1 : 0 });
    done += p;
  }
  return { fragments: out };
}

// ---- TCP conversation (synthetic, relative sequence numbers) ----

export interface Segment {
  from: 'C' | 'S';
  flags: string;
  seq: number;
  ack?: number;
  len: number;
  info: string;
  https: string;
  explain: string;
}

export const TCP_HOSTS = { C: '192.168.1.10:51514', S: '192.168.1.20:80' };

export const TCP_CONVERSATION: Segment[] = [
  { from: 'C', flags: 'SYN', seq: 0, len: 0, info: 'Αίτημα σύνδεσης', https: 'Ορατό (το TCP δεν κρυπτογραφείται)', explain: 'Ο client ζητά σύνδεση και διαπραγματεύεται παραμέτρους. Το SYN «καταναλώνει» έναν αριθμό ακολουθίας.' },
  { from: 'S', flags: 'SYN, ACK', seq: 0, ack: 1, len: 0, info: 'Αποδοχή', https: 'Ορατό', explain: 'Ο server επιβεβαιώνει το SYN (Ack = 0 + 1 = 1) και ξεκινά τη δική του κατεύθυνση.' },
  { from: 'C', flags: 'ACK', seq: 1, ack: 1, len: 0, info: 'Η σύνδεση άνοιξε', https: 'Ορατό', explain: 'Ο client επιβεβαιώνει το SYN του server. Τέλος της χειραψίας τριών βημάτων.' },
  { from: 'C', flags: 'PSH, ACK', seq: 1, ack: 1, len: 100, info: 'GET / HTTP/1.1', https: 'Μόνο «TLS Application Data»: το αίτημα δεν διαβάζεται', explain: 'Το αίτημα HTTP: 100 bytes, από Seq = 1. Το επόμενο byte του client θα είναι το 101.' },
  { from: 'S', flags: 'ACK', seq: 1, ack: 101, len: 0, info: 'Επιβεβαίωση του αιτήματος', https: 'Ορατό', explain: 'Ack = 1 + 100 = 101: «έλαβα όλα τα bytes έως το 100, περιμένω το 101».' },
  { from: 'S', flags: 'PSH, ACK', seq: 1, ack: 101, len: 200, info: 'HTTP/1.1 200 OK (1ο τμήμα)', https: 'Μόνο «TLS Application Data»', explain: 'Ο server στέλνει 200 bytes από Seq = 1.' },
  { from: 'S', flags: 'PSH, ACK', seq: 201, ack: 101, len: 200, info: '2ο τμήμα της σελίδας', https: 'Μόνο «TLS Application Data»', explain: 'Άλλα 200 bytes, συνεχόμενα: Seq = 1 + 200 = 201.' },
  { from: 'C', flags: 'ACK', seq: 101, ack: 401, len: 0, info: 'Αθροιστική επιβεβαίωση', https: 'Ορατό', explain: 'Ένα ACK για δύο τμήματα: Ack = 201 + 200 = 401 επιβεβαιώνει όλα τα bytes έως το 400 (cumulative ACK).' },
  { from: 'C', flags: 'FIN, ACK', seq: 101, ack: 401, len: 0, info: 'Ο client τελείωσε', https: 'Ορατό', explain: 'Ο client κλείνει τη δική του κατεύθυνση. Το FIN, όπως το SYN, καταναλώνει έναν αριθμό.' },
  { from: 'S', flags: 'FIN, ACK', seq: 401, ack: 102, len: 0, info: 'Ο server επιβεβαιώνει και κλείνει', https: 'Ορατό', explain: 'Εδώ το ACK και το FIN του server ενώθηκαν σε ένα πακέτο (συχνή περίπτωση). Ack = 101 + 1 = 102.' },
  { from: 'C', flags: 'ACK', seq: 102, ack: 402, len: 0, info: 'Τέλος σύνδεσης', https: 'Ορατό', explain: 'Ο client επιβεβαιώνει το FIN του server. Η σύνδεση έκλεισε.' },
];

/** Checks that every Seq/Ack follows from the segments before it. */
export function checkConversation(segs: Segment[]): string[] {
  const next = { C: 0, S: 0 };
  const errors: string[] = [];
  segs.forEach((s, i) => {
    if (s.seq !== next[s.from]) errors.push(`#${i + 1}: seq ${s.seq} ≠ ${next[s.from]}`);
    const other = s.from === 'C' ? 'S' : 'C';
    if (s.ack !== undefined && s.ack !== next[other]) errors.push(`#${i + 1}: ack ${s.ack} ≠ ${next[other]}`);
    next[s.from] = s.seq + s.len + (/SYN|FIN/.test(s.flags) ? 1 : 0);
  });
  return errors;
}

// ---- traffic (synthetic) ----

export interface Pkt { t: number; src: string; dst: string; proto: 'HTTPS' | 'DNS' | 'HTTP' | 'SMB' | 'ARP'; bytes: number }

const PC = '192.168.1.10', NAS = '192.168.1.30', GW = '192.168.1.1', CDN = '203.0.113.50', WEB = '198.51.100.7';

/** One minute of a small office network: steady background, a download at 20–25 s, a backup at 40–44 s. */
export function trafficMinute(): Pkt[] {
  const out: Pkt[] = [];
  for (let t = 0; t < 60; t++) {
    out.push({ t, src: PC, dst: WEB, proto: 'HTTPS', bytes: 600 }, { t, src: WEB, dst: PC, proto: 'HTTPS', bytes: 1200 });
    if (t % 5 === 0) out.push({ t, src: PC, dst: GW, proto: 'DNS', bytes: 80 }, { t, src: GW, dst: PC, proto: 'DNS', bytes: 160 });
    if (t % 15 === 3) out.push({ t, src: PC, dst: 'FF:FF:FF:FF:FF:FF', proto: 'ARP', bytes: 60 });
    if (t % 10 === 7) out.push({ t, src: PC, dst: WEB, proto: 'HTTP', bytes: 400 }, { t, src: WEB, dst: PC, proto: 'HTTP', bytes: 900 });
    if (t >= 20 && t <= 25) for (let k = 0; k < 12; k++) out.push({ t, src: CDN, dst: PC, proto: 'HTTPS', bytes: 1500 });
    if (t >= 40 && t <= 44) for (let k = 0; k < 8; k++) out.push({ t, src: PC, dst: NAS, proto: 'SMB', bytes: 1500 });
  }
  return out;
}

export function perSecond(pkts: Pkt[], unit: 'packets' | 'bits'): number[] {
  const out = Array.from({ length: 60 }, () => 0);
  for (const p of pkts) out[p.t]! += unit === 'packets' ? 1 : p.bytes * 8;
  return out;
}

/** Conversations (src → dst) by bytes, largest first. */
export function topTalkers(pkts: Pkt[]): { pair: string; proto: string; bytes: number; packets: number }[] {
  const m = new Map<string, { pair: string; proto: string; bytes: number; packets: number }>();
  for (const p of pkts) {
    const k = `${p.src} → ${p.dst}|${p.proto}`;
    const e = m.get(k) ?? { pair: `${p.src} → ${p.dst}`, proto: p.proto, bytes: 0, packets: 0 };
    e.bytes += p.bytes; e.packets++;
    m.set(k, e);
  }
  return [...m.values()].sort((a, b) => b.bytes - a.bytes);
}
