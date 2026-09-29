import { describe, expect, it } from 'vitest';
import { serializeJsonLd } from '../serialize';

describe('serializeJsonLd', () => {
  it('cannot be broken out of a <script> element', () => {
    const hostile = { description: 'ok</script><script>alert(document.domain)</script>', a: '<!--', b: '&' };
    const out = serializeJsonLd(hostile);
    expect(out).not.toMatch(/<\/script/i);
    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
  });

  it('still round-trips as valid JSON', () => {
    const value = { t: 'a</script>b', n: 1, arr: ['<x>', '&'], sep: String.fromCharCode(0x2028) };
    expect(JSON.parse(serializeJsonLd(value))).toEqual(value);
  });
});
