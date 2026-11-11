import { describe, expect, it } from 'vitest';
import { ADMINS, ARP, PC, run, sharedMacs, suspicious } from './netcmd-lab';

describe('Windows network commands lab', () => {
  it('ipconfig and ipconfig /all agree with the workstation', () => {
    expect(run('ipconfig')).toContain(`IPv4 Address. . . . . . . . . . . : ${PC.ip}`);
    expect(run('ipconfig')).not.toContain('Physical Address');
    expect(run('ipconfig /all')).toContain(PC.mac);
    expect(run('ipconfig /release')).toMatch(/αποδεσμεύτηκε/);
  });

  it('ping: replies on the LAN and the Internet, times out for an absent host, finds no unknown name', () => {
    expect(run('ping 192.168.1.1')).toMatch(/Reply from 192\.168\.1\.1: bytes=32 time=1ms TTL=64/);
    expect(run('ping www.google.com')).toMatch(/Pinging www\.google\.com \[142\.250\.184\.100\]/);
    expect(run('ping 127.0.0.1')).toMatch(/time<1ms/);
    expect(run('ping 192.168.1.99')).toMatch(/Request timed out\.\n.*\n.*\n.*Lost = 4 \(100% loss\)/s);
    expect(run('ping nosuch.host')).toMatch(/could not find host/);
    expect(run('ping -l 128 192.168.1.1')).toMatch(/bytes=128/);
  });

  it('tracert: one hop on the LAN, the gateway first on the way out', () => {
    expect(run('tracert 192.168.1.1')).toMatch(/^ {2}1 .*192\.168\.1\.1$/m);
    const out = run('tracert www.google.com');
    expect(out).toMatch(/^ {2}1 .*gateway \[192\.168\.1\.1\]$/m);
    expect(out).toMatch(/^ {2}7 .*www\.google\.com \[142\.250\.184\.100\]$/m);
  });

  it('the three planted findings', () => {
    expect(sharedMacs()).toEqual(['192.168.1.1', '192.168.1.66']);
    expect(sharedMacs(ARP.filter(([ip]) => ip !== '192.168.1.66'))).toEqual([]);
    const sus = suspicious().map((r) => r.slice(1, 3).join(' → '));
    expect(sus).toEqual(['0.0.0.0:4444 → 0.0.0.0:0', '192.168.1.23:50244 → 185.220.101.7:6667']);
    expect(ADMINS).toContain('helpdesk');
    expect(run('net localgroup Administrators')).toMatch(/helpdesk/);
  });

  it('netstat: -a adds LISTENING ports, -o adds PIDs, -b names the programs', () => {
    expect(run('netstat')).not.toContain('LISTENING');
    expect(run('netstat -a')).toContain('LISTENING');
    expect(run('netstat -ano')).toMatch(/0\.0\.0\.0:4444 +0\.0\.0\.0:0 +LISTENING +6660/);
    expect(run('netstat -b')).toContain('[svch0st.exe]');
  });

  it('arp -a lists the cache; nslookup resolves names and reverse lookups', () => {
    expect(run('arp -a').match(/00-0C-29-AA-66-01/g)).toHaveLength(2);
    expect(run('nslookup www.example.com')).toMatch(/Address: {2}93\.184\.215\.14/);
    expect(run('nslookup 8.8.8.8')).toMatch(/dns\.google/);
    expect(run('nslookup nope.invalid')).toMatch(/Non-existent domain/);
  });

  it('net commands and unknown commands', () => {
    expect(run('net user')).toMatch(/helpdesk/);
    expect(run('net user helpdesk')).toMatch(/03:12:44 AM/);
    expect(run('net share')).toMatch(/ADMIN\$/);
    expect(run('net localgroup Administrators helpdesk /delete')).toMatch(/Access is denied/);
    expect(run('route print')).toMatch(/0\.0\.0\.0 +0\.0\.0\.0 +192\.168\.1\.1/);
    expect(run('netsh advfirewall show allprofiles state')).toMatch(/Public Profile[\s\S]*OFF/);
    expect(run('dir')).toMatch(/is not recognized/);
  });
});
