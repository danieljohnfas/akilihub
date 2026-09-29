import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Stateless HMAC tokens for email links (e.g. double opt-in confirmation).
 * The token proves the link was issued by us for that exact (purpose, subject).
 */
function secret(): string {
  const s = process.env.EMAIL_TOKEN_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('EMAIL_TOKEN_SECRET (or ADMIN_SESSION_SECRET) must be set in production.');
  }
  return 'dev-only-email-token-secret';
}

export function signToken(purpose: string, subject: string): string {
  return createHmac('sha256', secret()).update(`${purpose}:${subject}`).digest('base64url');
}

export function verifyToken(purpose: string, subject: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const expected = Buffer.from(signToken(purpose, subject));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
