import { describe, expect, it } from 'vitest';
import {
  assertPublicHttpUrl,
  isPrivateHostname,
  isSafeHttpUrl,
  isSafeRelativePath,
  sameUrl,
} from '../safe-url';

const blocked = (u: string) => {
  try {
    assertPublicHttpUrl(u);
    return false;
  } catch {
    return true;
  }
};

describe('assertPublicHttpUrl', () => {
  it.each([
    'http://127.0.0.1/',
    'http://localhost/',
    'http://foo.localhost/',
    'http://10.1.2.3/',
    'http://172.16.0.1/',
    'http://192.168.1.1/',
    'http://169.254.169.254/latest/meta-data/',
    'http://100.64.0.1/', // CGNAT
    'http://0.0.0.0/',
    'http://[::1]/',
    'http://[::]/',
    'http://[::ffff:127.0.0.1]/', // IPv4-mapped loopback
    'http://[::ffff:7f00:1]/',
    'http://[::ffff:a9fe:a9fe]/', // IPv4-mapped metadata
    'http://[fe80::1]/',
    'http://[fd00::1]/',
    'http://[fc00::1]/',
    'http://0x7f.1/', // normalised by the URL parser
    'http://2130706433/', // decimal loopback
    'http://redis:6379/', // single-label docker hostname
    'http://metadata.google.internal/',
    'ftp://example.com/',
    'file:///etc/passwd',
    'javascript:alert(1)',
    'http://user:pass@example.com/',
  ])('blocks %s', (u) => {
    expect(blocked(u)).toBe(true);
  });

  it.each([
    'https://www.fda.gov/',
    'https://fdic.gov/', // must NOT be mistaken for an fc/fd IPv6 prefix
    'https://fcc.gov/',
    'https://fdlp.gov/',
    'https://example.co.ke/jobs?id=1',
    'http://8.8.8.8/',
    'http://[2606:4700:4700::1111]/',
  ])('allows %s', (u) => {
    expect(blocked(u)).toBe(false);
  });
});

describe('isPrivateHostname', () => {
  it('handles trailing dots and case', () => {
    expect(isPrivateHostname('LOCALHOST.')).toBe(true);
    expect(isPrivateHostname('Example.COM')).toBe(false);
  });
});

describe('isSafeHttpUrl', () => {
  it('accepts plain http(s) and rejects other schemes / credentials', () => {
    expect(isSafeHttpUrl('https://a.example/x')).toBe(true);
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('https://u:p@a.example/')).toBe(false);
    expect(isSafeHttpUrl('not a url')).toBe(false);
  });
});

describe('isSafeRelativePath', () => {
  it('only accepts in-app absolute paths', () => {
    expect(isSafeRelativePath('/account')).toBe(true);
    expect(isSafeRelativePath('//evil.com')).toBe(false);
    expect(isSafeRelativePath('/\\evil.com')).toBe(false);
    expect(isSafeRelativePath('https://evil.com')).toBe(false);
    expect(isSafeRelativePath('javascript:alert(1)')).toBe(false);
  });
});

describe('sameUrl', () => {
  it('normalises before comparing', () => {
    expect(sameUrl('https://a.example', 'https://a.example/')).toBe(true);
    expect(sameUrl('https://a.example/x', 'https://evil.example/x')).toBe(false);
    expect(sameUrl(null, 'https://a.example')).toBe(false);
  });
});
