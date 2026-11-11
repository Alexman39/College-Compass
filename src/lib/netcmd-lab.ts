/**
 * A Windows command prompt for the CN6003 Week 5 lab (src/scripts/demos/sec-terminal.ts):
 * the network commands of «Δικτυακές εντολές και ασφάλεια δικτύου» (ping,
 * ipconfig, tracert, netstat, arp, route, nslookup, net …) on one synthetic
 * workstation, LAB-PC23. The outputs are invented but consistent with each
 * other, and three things are planted for the student to find:
 *
 *  1. a program listening on port 4444, svch0st.exe (zero, not «o»);
 *  2. the gateway's MAC address also used by 192.168.1.66: ARP spoofing;
 *  3. an unexpected member, «helpdesk», in the local Administrators group.
 *
 * Pure logic; tested in netcmd-lab.test.ts.
 */

export const PC = {
  name: 'LAB-PC23',
  ip: '192.168.1.23',
  mask: '255.255.255.0',
  gateway: '192.168.1.1',
  dns: '192.168.1.1',
  mac: '3C-52-82-1A-7F-23',
};

/** The ARP cache, as `arp -a` prints it. The attacker 192.168.1.66 answers for the gateway too. */
export const ARP: [ip: string, mac: string, type: 'dynamic' | 'static'][] = [
  ['192.168.1.1', '00-0C-29-AA-66-01', 'dynamic'],
  ['192.168.1.12', '3C-52-82-1A-7F-12', 'dynamic'],
  ['192.168.1.40', 'B8-27-EB-41-0C-40', 'dynamic'],
  ['192.168.1.66', '00-0C-29-AA-66-01', 'dynamic'],
  ['192.168.1.255', 'FF-FF-FF-FF-FF-FF', 'static'],
];

/** IPs that share a MAC address with another IP (broadcast excluded). */
export function sharedMacs(table = ARP): string[] {
  const byMac = new Map<string, string[]>();
  for (const [ip, mac] of table) if (mac !== 'FF-FF-FF-FF-FF-FF') byMac.set(mac, [...(byMac.get(mac) ?? []), ip]);
  return [...byMac.values()].filter((ips) => ips.length > 1).flat().sort();
}

/** `netstat -ano` rows: protocol, local, foreign, state, PID, program (for -b). */
export const CONNECTIONS: [proto: string, local: string, foreign: string, state: string, pid: number, exe: string][] = [
  ['TCP', '0.0.0.0:135', '0.0.0.0:0', 'LISTENING', 912, 'svchost.exe'],
  ['TCP', '0.0.0.0:445', '0.0.0.0:0', 'LISTENING', 4, 'System'],
  ['TCP', '0.0.0.0:3389', '0.0.0.0:0', 'LISTENING', 1180, 'svchost.exe'],
  ['TCP', '0.0.0.0:4444', '0.0.0.0:0', 'LISTENING', 6660, 'svch0st.exe'],
  ['TCP', '192.168.1.23:50211', '142.250.184.100:443', 'ESTABLISHED', 4120, 'chrome.exe'],
  ['TCP', '192.168.1.23:50218', '20.42.65.92:443', 'ESTABLISHED', 2200, 'OneDrive.exe'],
  ['TCP', '192.168.1.23:50230', '192.168.1.12:445', 'ESTABLISHED', 4, 'System'],
  ['TCP', '192.168.1.23:50244', '185.220.101.7:6667', 'SYN_SENT', 6660, 'svch0st.exe'],
  ['UDP', '0.0.0.0:5353', '*:*', '', 1500, 'svchost.exe'],
];

/** Well-known ports a workstation is expected to show (slide «NETSTAT»). */
const EXPECTED_PORTS = new Set([135, 139, 445, 3389, 5353, 443]);

/** Rows worth a second look: an unusual listening port, or a connection to an unusual remote port. */
export function suspicious(rows = CONNECTIONS) {
  return rows.filter(([proto, local, foreign, state]) => {
    if (proto !== 'TCP') return false;
    const lp = Number(local.split(':').at(-1));
    const fp = Number(foreign.split(':').at(-1));
    return state === 'LISTENING' ? !EXPECTED_PORTS.has(lp) : !EXPECTED_PORTS.has(fp);
  });
}

export const ADMINS = ['Administrator', 'student', 'helpdesk'];

const HOSTS: Record<string, string> = {
  'www.google.com': '142.250.184.100',
  'google.com': '142.250.184.100',
  'www.example.com': '93.184.215.14',
  'example.com': '93.184.215.14',
  'www.mitropolitiko.edu.gr': '195.251.255.68',
  localhost: '127.0.0.1',
};
const REVERSE: Record<string, string> = { '8.8.8.8': 'dns.google', '142.250.184.100': 'fra16s48-in-f4.1e100.net', '93.184.215.14': '(χωρίς αντίστροφη εγγραφή)' };

/** Hops of `tracert`, with their round-trip times in ms. */
const ROUTE: [string, string, number][] = [
  ['gateway', '192.168.1.1', 1],
  ['', '10.120.0.1', 9],
  ['ae1.ath-core1.isp.gr', '62.103.0.17', 11],
  ['', '62.103.1.250', 12],
  ['', '142.250.160.226', 38],
  ['', '209.85.244.18', 39],
];

const lanIp = (s: string) => /^192\.168\.1\.(\d{1,3})$/.exec(s);
const isIp = (s: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(s);
const resolveName = (s: string) => (isIp(s) ? s : HOSTS[s.toLowerCase()]);

function ping(args: string[]): string {
  // the target is the first word that is neither a flag nor a flag's value (-n 4, -l 128)
  const target = args.find((a, i) => !/^[-/]/.test(a) && !/^-[nlwi]$/i.test(args[i - 1] ?? ''));
  if (!target) return 'Usage: ping [-n count] [-l size] target_name\n';
  const ip = resolveName(target);
  if (!ip) return `Ping request could not find host ${target}. Please check the name and try again.\n`;
  const size = Number(args[args.indexOf('-l') + 1]) || 32;
  const head = `\nPinging ${target}${ip !== target ? ` [${ip}]` : ''} with ${size} bytes of data:\n`;
  const lan = lanIp(ip);
  const alive = ip === '127.0.0.1' || ip === PC.ip || (lan && ARP.some(([a]) => a === ip)) || (!lan && !ip.startsWith('10.'));
  if (!alive) return head + 'Request timed out.\n'.repeat(4) + `\nPing statistics for ${ip}:\n    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss),\n`;
  const t = ip === '127.0.0.1' || ip === PC.ip ? 0 : lan ? 1 : 38;
  const ttl = ip === '127.0.0.1' || ip === PC.ip ? 128 : lan ? 64 : 117;
  const reply = `Reply from ${ip}: bytes=${size} time${t ? `=${t}ms` : '<1ms'} TTL=${ttl}\n`;
  return head + reply.repeat(4) + `\nPing statistics for ${ip}:\n    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),\nApproximate round trip times in milli-seconds:\n    Minimum = ${t}ms, Maximum = ${t}ms, Average = ${t}ms\n`;
}

function ipconfig(args: string[]): string {
  const a = args.map((x) => x.toLowerCase());
  if (a.includes('/release')) return `\nEthernet adapter Ethernet:\n\n   Connection-specific DNS Suffix  . :\n   IPv4 Address. . . . . . . . . . . : (καμία· η διεύθυνση αποδεσμεύτηκε)\n`;
  if (a.includes('/renew')) return `\nEthernet adapter Ethernet:\n\n   IPv4 Address. . . . . . . . . . . : ${PC.ip}\n   Subnet Mask . . . . . . . . . . . : ${PC.mask}\n   Default Gateway . . . . . . . . . : ${PC.gateway}\n`;
  const all = a.includes('/all');
  return [
    '',
    'Windows IP Configuration',
    '',
    ...(all ? [`   Host Name . . . . . . . . . . . . : ${PC.name}`, '   Node Type . . . . . . . . . . . . : Hybrid', ''] : []),
    'Ethernet adapter Ethernet:',
    '',
    ...(all ? [`   Physical Address. . . . . . . . . : ${PC.mac}`, '   DHCP Enabled. . . . . . . . . . . : Yes'] : []),
    `   IPv4 Address. . . . . . . . . . . : ${PC.ip}${all ? '(Preferred)' : ''}`,
    `   Subnet Mask . . . . . . . . . . . : ${PC.mask}`,
    `   Default Gateway . . . . . . . . . : ${PC.gateway}`,
    ...(all ? [`   DHCP Server . . . . . . . . . . . : ${PC.gateway}`, `   DNS Servers . . . . . . . . . . . : ${PC.dns}`] : []),
    '',
    'Wireless LAN adapter Wi-Fi:',
    '',
    '   Media State . . . . . . . . . . . : Media disconnected',
    '',
  ].join('\n');
}

function tracert(args: string[]): string {
  const target = args.find((a) => !a.startsWith('-'));
  if (!target) return 'Usage: tracert target_name\n';
  const ip = resolveName(target);
  if (!ip) return `Unable to resolve target system name ${target}.\n`;
  const lan = lanIp(ip);
  const hops = lan ? [[target === ip ? '' : target, ip, 1] as [string, string, number]] : [...ROUTE, [target === ip ? '' : target, ip, 38] as [string, string, number]];
  const rows = hops.map(([name, addr, ms], i) => `${String(i + 1).padStart(3)}  ${`${ms} ms`.padStart(7)}${`${ms} ms`.padStart(9)}${`${ms} ms`.padStart(9)}  ${name ? `${name} [${addr}]` : addr}`);
  return `\nTracing route to ${target}${ip !== target ? ` [${ip}]` : ''}\nover a maximum of 30 hops:\n\n${rows.join('\n')}\n\nTrace complete.\n`;
}

function netstat(args: string[]): string {
  const flags = args.join('').toLowerCase();
  const numeric = flags.includes('n');
  const showAll = flags.includes('a');
  const owner = flags.includes('o');
  const exe = flags.includes('b');
  const rows = CONNECTIONS.filter(([, , , state]) => showAll || (state !== 'LISTENING' && state !== ''));
  const name = (addr: string) => (numeric ? addr : addr.replace(PC.ip, PC.name).replace('142.250.184.100:443', 'fra16s48-in-f4:https'));
  const out = ['', 'Active Connections', '', `  Proto  Local Address          Foreign Address        State${owner ? '           PID' : ''}`];
  for (const [proto, local, foreign, state, pid, prog] of rows) {
    out.push(`  ${proto.padEnd(7)}${name(local).padEnd(23)}${name(foreign).padEnd(23)}${state.padEnd(16)}${owner ? String(pid) : ''}`.trimEnd());
    if (exe) out.push(` [${prog}]`);
  }
  return out.join('\n') + '\n';
}

function arp(args: string[]): string {
  if (!args.length) return 'Χρήση: arp -a, arp -d IP, arp -s IP MAC\n';
  const f = args[0]!.toLowerCase();
  if (f === '-a' || f === '/a') {
    return `\nInterface: ${PC.ip} --- 0x6\n  Internet Address      Physical Address      Type\n${ARP.map(([ip, mac, type]) => `  ${ip.padEnd(22)}${mac.padEnd(22)}${type}`).join('\n')}\n`;
  }
  if (f === '-d') return args[1] ? `(Η εγγραφή ${args[1]} διαγράφηκε· θα ξαναμαθευτεί με νέο ARP request.)\n` : 'Χρήση: arp -d IP\n';
  if (f === '-s') return args[1] && args[2] ? `(Στατική εγγραφή ${args[1]} → ${args[2]}. Μια στατική εγγραφή για την πύλη προστατεύει από ARP spoofing.)\n` : 'Χρήση: arp -s IP MAC\n';
  return 'Χρήση: arp -a, arp -d IP, arp -s IP MAC\n';
}

function route(args: string[]): string {
  const sub = (args[0] ?? '').toLowerCase();
  if (sub === 'print') {
    return [
      '===========================================================================',
      'IPv4 Route Table',
      '===========================================================================',
      'Active Routes:',
      'Network Destination        Netmask          Gateway       Interface  Metric',
      `          0.0.0.0          0.0.0.0      ${PC.gateway}     ${PC.ip}     25`,
      '        127.0.0.0        255.0.0.0         On-link         127.0.0.1    331',
      `      192.168.1.0    255.255.255.0         On-link      ${PC.ip}    281`,
      `     192.168.1.23  255.255.255.255         On-link      ${PC.ip}    281`,
      '===========================================================================',
      '',
    ].join('\n');
  }
  if (sub === 'add') return args.length >= 5 ? ' OK!\n' : 'Χρήση: route add ΔΙΚΤΥΟ mask ΜΑΣΚΑ ΠΥΛΗ\n';
  if (sub === 'delete') return args[1] ? ' OK!\n' : 'Χρήση: route delete ΔΙΚΤΥΟ\n';
  return 'Χρήση: route print | route add … | route delete …\n';
}

function nslookup(args: string[]): string {
  const q = args[0];
  if (!q) return 'Χρήση: nslookup όνομα ή nslookup IP\n';
  const head = `Server:  gateway\nAddress:  ${PC.dns}\n\n`;
  if (isIp(q)) return REVERSE[q] ? `${head}Name:    ${REVERSE[q]}\nAddress:  ${q}\n` : `${head}*** gateway can't find ${q}: Non-existent domain\n`;
  const ip = HOSTS[q.toLowerCase()];
  return ip ? `${head}Non-authoritative answer:\nName:    ${q}\nAddress:  ${ip}\n` : `${head}*** gateway can't find ${q}: Non-existent domain\n`;
}

function net(args: string[]): string {
  const sub = (args[0] ?? '').toLowerCase();
  const rest = args.slice(1);
  switch (sub) {
    case 'user':
      if (rest[0]) return `User name                    ${rest[0]}\nAccount active               Yes\nPassword last set            ${rest[0].toLowerCase() === 'helpdesk' ? '11/19/2026 03:12:44 AM' : '9/30/2026 9:02:10 AM'}\nLocal Group Memberships      *${ADMINS.includes(rest[0]) ? 'Administrators' : 'Users'}\nThe command completed successfully.\n`;
      return `\nUser accounts for \\\\${PC.name}\n\n-------------------------------------------------------------------------------\nAdministrator            Guest                    helpdesk\nstudent\nThe command completed successfully.\n`;
    case 'localgroup':
      if ((rest[0] ?? '').toLowerCase() === 'administrators' && rest.length === 1) {
        return `Alias name     Administrators\nComment        Administrators have complete and unrestricted access to the computer/domain\n\nMembers\n\n-------------------------------------------------------------------------------\n${ADMINS.join('\n')}\nThe command completed successfully.\n`;
      }
      if (rest.some((r) => /^\/(add|delete)$/i.test(r))) return 'System error 5 has occurred.\n\nAccess is denied.\n(Χρειάζεται γραμμή εντολών ως διαχειριστής· στο εργαστήριο μόνο σε δική σου εικονική μηχανή.)\n';
      return 'Χρήση: net localgroup Administrators\n';
    case 'share':
      return `\nShare name   Resource                        Remark\n\n-------------------------------------------------------------------------------\nC$           C:\\                             Default share\nIPC$                                         Remote IPC\nADMIN$       C:\\Windows                      Remote Admin\nLabFiles     C:\\LabFiles\nThe command completed successfully.\n`;
    case 'use':
      if (!rest.length) return 'New connections will be remembered.\n\nStatus       Local     Remote                    Network\n-------------------------------------------------------------------------------\nOK           Z:        \\\\192.168.1.12\\shared     Microsoft Windows Network\nThe command completed successfully.\n';
      return 'The command completed successfully.\n';
    case 'view':
      return 'Server Name            Remark\n\n-------------------------------------------------------------------------------\n\\\\LAB-PC12\n\\\\LAB-PC23\n\\\\NAS-01                 Αρχεία εργαστηρίου\nThe command completed successfully.\n';
    case 'start':
      if (!rest.length) return 'These Windows services are started:\n\n   DHCP Client\n   DNS Client\n   Server\n   Windows Defender Antivirus Service\n   Workstation\n\nThe command completed successfully.\n';
      return `The ${rest.join(' ')} service was started successfully.\n`;
    case 'stop':
      return `The ${rest.join(' ')} service was stopped successfully.\n(Προσοχή: αν σταματήσεις την υπηρεσία ασφαλείας, ο υπολογιστής μένει απροστάτευτος.)\n`;
    case 'statistics':
      return `${(rest[0] ?? 'workstation').toLowerCase() === 'server' ? 'Server' : 'Workstation'} Statistics for \\\\${PC.name}\n\nStatistics since 11/20/2026 8:01:12 AM\n\n  Bytes received                    18452117\n  Sessions started                         3\n  Failed sessions                          0\n  Password violations                      3\n\nThe command completed successfully.\n`;
    case 'config':
      return `Computer name                        \\\\${PC.name}\nFull Computer name                   ${PC.name.toLowerCase()}\nUser name                            student\nWorkstation domain                   WORKGROUP\nThe command completed successfully.\n`;
    case 'time':
      return `Current time at \\\\${PC.name} is 11/20/2026 10:00:00 AM\nThe command completed successfully.\n`;
    case 'help':
    case '':
      return 'NET [ ACCOUNTS | COMPUTER | CONFIG | CONTINUE | FILE | GROUP | HELP |\n      HELPMSG | LOCALGROUP | PAUSE | SESSION | SHARE | START |\n      STATISTICS | STOP | TIME | USE | USER | VIEW ]\n';
    default:
      return 'The syntax of this command is:\n\nNET [ ... ]\n';
  }
}

function netsh(args: string[]): string {
  const line = args.join(' ').toLowerCase();
  if (line.startsWith('advfirewall show allprofiles state')) return '\nDomain Profile Settings:\n----------------------------------------------------------------------\nState                                 ON\n\nPrivate Profile Settings:\n----------------------------------------------------------------------\nState                                 ON\n\nPublic Profile Settings:\n----------------------------------------------------------------------\nState                                 OFF\nOk.\n';
  if (line.startsWith('interface ipv4 show config')) return `\nConfiguration for interface "Ethernet"\n    DHCP enabled:                         Yes\n    IP Address:                           ${PC.ip}\n    Subnet Prefix:                        192.168.1.0/24 (mask ${PC.mask})\n    Default Gateway:                      ${PC.gateway}\n    DNS servers configured through DHCP:  ${PC.dns}\n`;
  if (line.startsWith('wlan show profiles')) return '\nUser profiles\n-------------\n    All User Profile     : LAB-WIFI\n    All User Profile     : Cafe-Free-WiFi\n';
  return 'Δοκίμασε: netsh interface ipv4 show config, netsh wlan show profiles, netsh advfirewall show allprofiles state\n';
}

const COMMANDS: Record<string, (args: string[]) => string> = { ping, ipconfig, tracert, netstat, arp, route, nslookup, net, netsh, hostname: () => `${PC.name}\n` };
export const COMMAND_NAMES = Object.keys(COMMANDS);

export function run(line: string): string {
  const words = line.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  const name = words[0]!.toLowerCase().replace(/\.exe$/, '');
  if (name === 'help') return `Εντολές: ${COMMAND_NAMES.join(', ')}. Για net: net help.\n`;
  const cmd = COMMANDS[name];
  return cmd ? cmd(words.slice(1)) : `'${words[0]}' is not recognized as an internal or external command,\noperable program or batch file.\n`;
}

export const PROMPT = 'C:\\Users\\student> ';

/** The three findings of the investigation, and what reveals each. */
export const FINDINGS = [
  { id: 'port', label: 'Πρόγραμμα που ακούει στη θύρα 4444', how: 'netstat -ano ή netstat -b' },
  { id: 'arp', label: 'Δύο IP με την ίδια MAC (της πύλης)', how: 'arp -a' },
  { id: 'admin', label: 'Άγνωστος λογαριασμός στους Administrators', how: 'net localgroup Administrators' },
] as const;
