import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetMemoryLimiter } from '@/lib/security/rate-limit';
import { POST } from '../route';

const post = (body: string, ip = '9.9.9.9') =>
  POST(new Request('https://x.test/api/csp-report', { method: 'POST', body, headers: { 'x-real-ip': ip } }));

describe('POST /api/csp-report', () => {
  beforeEach(() => {
    resetMemoryLimiter();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('accepts legacy and Reporting-API payloads with 204 and logs a one-line summary', async () => {
    const legacy = JSON.stringify({ 'csp-report': { 'effective-directive': 'script-src', 'blocked-uri': 'https://evil.example/x.js', 'document-uri': 'https://akilibrain.com/' } });
    expect((await post(legacy)).status).toBe(204);
    const modern = JSON.stringify([{ type: 'csp-violation', body: { effectiveDirective: 'img-src', blockedURL: 'https://cdn.example/a.png', documentURL: 'https://akilibrain.com/jobs' } }]);
    expect((await post(modern)).status).toBe(204);
    expect(console.warn).toHaveBeenCalledWith('[csp-report]', expect.stringContaining('"directive":"script-src"'));
  });

  it('never fails on malformed or oversized input', async () => {
    expect((await post('not json')).status).toBe(204);
    expect((await post('x'.repeat(50_000))).status).toBe(204);
  });

  it('is rate limited per client', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 32; i++) statuses.push((await post('{}', '7.7.7.7')).status);
    expect(statuses.slice(0, 30).every((s) => s === 204)).toBe(true);
    expect(statuses[31]).toBe(429);
  });
});
