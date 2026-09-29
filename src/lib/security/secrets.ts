import { createHash, timingSafeEqual } from 'crypto';

/**
 * Constant-time string comparison for shared secrets / tokens.
 * Hashing first equalises lengths so `timingSafeEqual` never throws and the
 * comparison time does not leak the secret length.
 */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Reads a shared secret from a request.
 *
 * Preferred: `Authorization: Bearer <secret>` or `x-trigger-secret: <secret>`.
 * Deprecated: `?secret=` query param — kept so existing schedulers keep working,
 * but query strings end up in proxy/CDN/access logs, so callers should migrate.
 */
export function extractSecret(req: Request): string | null {
  const auth = req.headers.get('authorization');
  if (auth && /^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, '').trim() || null;

  const header = req.headers.get('x-trigger-secret');
  if (header) return header.trim() || null;

  try {
    return new URL(req.url).searchParams.get('secret');
  } catch {
    return null;
  }
}

/** True when the request carries `expected` (and `expected` is configured). */
export function hasValidSecret(req: Request, expected: string | undefined): boolean {
  if (!expected) return false;
  return safeEqual(extractSecret(req), expected);
}
