import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import { decryptSecret, encryptSecret, isEncrypted } from '../crypto';
import { signAdminSession, verifyAdminSession } from '../session';

const ORIGINAL = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('TOTP secret encryption', () => {
  beforeEach(() => {
    process.env.ADMIN_TOTP_ENCRYPTION_KEY = 'test-key-1';
  });

  it('round-trips and never stores plaintext', () => {
    const enc = encryptSecret('JBSWY3DPEHPK3PXP');
    expect(isEncrypted(enc)).toBe(true);
    expect(enc).not.toContain('JBSWY3DPEHPK3PXP');
    expect(decryptSecret(enc)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('uses a fresh IV each time', () => {
    expect(encryptSecret('x')).not.toBe(encryptSecret('x'));
  });

  it('accepts legacy plaintext values', () => {
    expect(decryptSecret('JBSWY3DPEHPK3PXP')).toBe('JBSWY3DPEHPK3PXP');
  });

  it('rejects ciphertext under a different key', () => {
    const enc = encryptSecret('secret');
    process.env.ADMIN_TOTP_ENCRYPTION_KEY = 'another-key';
    expect(() => decryptSecret(enc)).toThrow();
  });

  it('rejects tampered ciphertext (GCM auth tag)', () => {
    const enc = encryptSecret('secret');
    const parts = enc.split(':');
    parts[parts.length - 1] = Buffer.from('tampered!!').toString('base64');
    expect(() => decryptSecret(parts.join(':'))).toThrow();
  });
});

describe('admin session JWT', () => {
  it('accepts a freshly signed token', async () => {
    expect(await verifyAdminSession(await signAdminSession())).toBe(true);
  });

  it('rejects garbage and tokens signed with another secret', async () => {
    expect(await verifyAdminSession('not.a.jwt')).toBe(false);
    const forged = await new SignJWT({ role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('akilibrain-admin')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('attacker-secret'));
    expect(await verifyAdminSession(forged)).toBe(false);
  });

  it('rejects tokens with the wrong issuer or role', async () => {
    const secret = new TextEncoder().encode('fallback-dev-secret-change-in-production');
    const wrongIssuer = await new SignJWT({ role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('someone-else')
      .setExpirationTime('1h')
      .sign(secret);
    const wrongRole = await new SignJWT({ role: 'user' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('akilibrain-admin')
      .setExpirationTime('1h')
      .sign(secret);
    expect(await verifyAdminSession(wrongIssuer)).toBe(false);
    expect(await verifyAdminSession(wrongRole)).toBe(false);
  });
});
