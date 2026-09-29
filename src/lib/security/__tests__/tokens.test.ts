import { describe, expect, it } from 'vitest';
import { signToken, verifyToken } from '../tokens';

describe('email tokens', () => {
  it('verifies only the exact purpose+subject it was issued for', () => {
    const t = signToken('confirm', 'user-1');
    expect(verifyToken('confirm', 'user-1', t)).toBe(true);
    expect(verifyToken('confirm', 'user-2', t)).toBe(false);
    expect(verifyToken('unsubscribe', 'user-1', t)).toBe(false);
  });

  it('rejects missing, truncated and tampered tokens', () => {
    const t = signToken('confirm', 'user-1');
    expect(verifyToken('confirm', 'user-1', undefined)).toBe(false);
    expect(verifyToken('confirm', 'user-1', t.slice(0, -2))).toBe(false);
    expect(verifyToken('confirm', 'user-1', `${t.slice(0, -1)}${t.endsWith('A') ? 'B' : 'A'}`)).toBe(false);
  });
});
