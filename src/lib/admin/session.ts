import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'admin_session';

let _secret: Uint8Array | null = null;

function getSecret(): Uint8Array {
  if (_secret) return _secret;
  
  // Fail fast in production if the secret is not configured — a missing secret
  // would allow any attacker who knows the fallback string to forge admin JWTs.
  if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_SESSION_SECRET) {
    throw new Error('[admin/session] ADMIN_SESSION_SECRET env var is required in production.');
  }

  _secret = new TextEncoder().encode(
    process.env.ADMIN_SESSION_SECRET || 'fallback-dev-secret-change-in-production'
  );
  return _secret;
}

export async function signAdminSession(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret());
}

export async function verifyAdminSession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

