import { describe, expect, it } from 'vitest';
import { unsubscribeHeaders, unsubscribePageUrl } from '../unsubscribe';

describe('unsubscribe headers', () => {
  it('emits RFC 8058 one-click headers pointing at the user', () => {
    const h = unsubscribeHeaders('11111111-1111-4111-8111-111111111111');
    expect(h['List-Unsubscribe']).toMatch(/^<https?:\/\/[^>]+\/api\/unsubscribe\?user_id=11111111-1111-4111-8111-111111111111>, <https?:\/\/[^>]+\/unsubscribe\?user_id=/);
    expect(h['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  });

  it('encodes the id', () => {
    expect(unsubscribePageUrl('a b')).toContain('user_id=a%20b');
  });
});
