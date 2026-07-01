import { SignJWT, jwtVerify } from 'jose';

const SESSION_COOKIE = 'admin_session';
const SECRET = new TextEncoder().encode(
  process.env.ADMIN_SESSION_SECRET || 'fallback-dev-secret-change-in-production'
);

export { SESSION_COOKIE };

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
