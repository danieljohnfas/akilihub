import { beforeEach, describe, expect, it } from 'vitest';
import { clientIpFromHeaders, memoryLimit, resetMemoryLimiter, windowToMs } from '../rate-limit';

const h = (obj: Record<string, string>) => ({ get: (k: string) => obj[k.toLowerCase()] ?? null });

describe('memoryLimit', () => {
  beforeEach(() => resetMemoryLimiter());

  it('allows up to max hits per window then blocks', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) expect(memoryLimit('k', 3, 10_000, t0 + i).success).toBe(true);
    const blocked = memoryLimit('k', 3, 10_000, t0 + 5);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('recovers after the window slides', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) memoryLimit('k', 3, 10_000, t0);
    expect(memoryLimit('k', 3, 10_000, t0 + 1).success).toBe(false);
    expect(memoryLimit('k', 3, 10_000, t0 + 10_001).success).toBe(true);
  });

  it('isolates buckets by key', () => {
    memoryLimit('a', 1, 10_000, 1);
    expect(memoryLimit('a', 1, 10_000, 2).success).toBe(false);
    expect(memoryLimit('b', 1, 10_000, 2).success).toBe(true);
  });
});

describe('windowToMs', () => {
  it('parses s / m / h', () => {
    expect(windowToMs('10 s')).toBe(10_000);
    expect(windowToMs('15 m')).toBe(900_000);
    expect(windowToMs('1 h')).toBe(3_600_000);
  });
});

describe('clientIpFromHeaders', () => {
  it('prefers x-real-ip (set by our proxy) over forgeable x-forwarded-for', () => {
    expect(clientIpFromHeaders(h({ 'x-real-ip': '1.2.3.4', 'x-forwarded-for': '6.6.6.6, 7.7.7.7' }))).toBe('1.2.3.4');
  });

  it('uses the right-most x-forwarded-for entry (left-most is client-controlled)', () => {
    expect(clientIpFromHeaders(h({ 'x-forwarded-for': '6.6.6.6, 9.9.9.9' }))).toBe('9.9.9.9');
  });

  it('falls back to loopback', () => {
    expect(clientIpFromHeaders(h({}))).toBe('127.0.0.1');
  });
});
