import { describe, expect, it } from 'vitest';
import { extractSecret, hasValidSecret, safeEqual } from '../secrets';

describe('safeEqual', () => {
  it('compares equal / unequal / empty values', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
    expect(safeEqual('', '')).toBe(false);
    expect(safeEqual(undefined, 'x')).toBe(false);
  });
});

describe('extractSecret / hasValidSecret', () => {
  it('reads Bearer, x-trigger-secret, then the deprecated query param', () => {
    expect(extractSecret(new Request('https://x.test/a', { headers: { authorization: 'Bearer s3cret' } }))).toBe('s3cret');
    expect(extractSecret(new Request('https://x.test/a', { headers: { 'x-trigger-secret': 'hdr' } }))).toBe('hdr');
    expect(extractSecret(new Request('https://x.test/a?secret=q'))).toBe('q');
    expect(extractSecret(new Request('https://x.test/a'))).toBeNull();
  });

  it('never validates when the expected secret is unset', () => {
    const req = new Request('https://x.test/a', { headers: { authorization: 'Bearer undefined' } });
    expect(hasValidSecret(req, undefined)).toBe(false);
    expect(hasValidSecret(new Request('https://x.test/a', { headers: { authorization: 'Bearer ok' } }), 'ok')).toBe(true);
  });
});
