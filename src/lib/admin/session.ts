import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'admin_session';

// Fail fast in production if the secret is not configured — a missing secret
// would allow any attacker who knows the fallback string to forge admin JWTs.
if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_SESSION_SECRET) {
  throw new Error('[admin/session] ADMIN_SESSION_SECRET env var is required in production.');
}

const SECRET = new TextEncoder().encode(
  process.env.ADMIN_SESSION_SECRET || 'fallback-dev-secret-change-in-production'
);

export async function signAdminSession(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(SECRET);
}

export async function verifyAdminSession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, SECRET);
    return true;
  } catch {
    return false;
  }
}

