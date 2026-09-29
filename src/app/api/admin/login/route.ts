import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import * as OTPAuth from 'otpauth';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db/client';
import { adminConfig } from '@/lib/db/schema/admin';
import { signAdminSession, SESSION_COOKIE } from '@/lib/admin/session';
import { decryptSecret, encryptSecret, isEncrypted } from '@/lib/admin/crypto';
import { enforceRateLimit } from '@/lib/security/rate-limit';

// Highest TOTP time-step already accepted by this process (replay protection).
let lastAcceptedStep = 0;

const INVALID = () => NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

export async function POST(req: Request) {
  // Per-IP limit plus a global backstop against distributed brute force.
  const limited =
    (await enforceRateLimit(req, { prefix: 'admin-login', max: 5, window: '15 m' })) ??
    (await enforceRateLimit(req, { prefix: 'admin-login-global', max: 60, window: '1 h', key: 'global' }));
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => null);
    const password = typeof body?.password === 'string' ? body.password : '';
    const code = typeof body?.code === 'string' ? body.code.replace(/\s/g, '') : '';

    if (!password || !code || password.length > 200 || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Missing or malformed credentials' }, { status: 400 });
    }

    // Deliberately NOT safeQuery: a DB failure must surface as an error, not as "no admin".
    const [config] = await db.select().from(adminConfig).orderBy(asc(adminConfig.createdAt)).limit(1);
    if (!config || !config.isSetup) {
      return NextResponse.json({ error: 'Admin not configured. Please complete setup first.' }, { status: 403 });
    }

    // Always evaluate both factors, then answer with one generic error so the
    // response does not reveal which factor was wrong.
    const passwordValid = await bcrypt.compare(password, config.passwordHash);

    const totpSecret = decryptSecret(config.totpSecret);
    const totp = new OTPAuth.TOTP({
      issuer: 'AkiliHub',
      label: 'Admin',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: totpSecret,
    });
    const delta = totp.validate({ token: code, window: 1 });
    const step = delta === null ? 0 : Math.floor(Date.now() / 30_000) + delta;
    const totpValid = delta !== null && step > lastAcceptedStep;

    if (!passwordValid || !totpValid) return INVALID();
    lastAcceptedStep = step;

    // Opportunistically encrypt a legacy plaintext TOTP secret.
    if (!isEncrypted(config.totpSecret)) {
      const encrypted = encryptSecret(totpSecret);
      if (isEncrypted(encrypted)) {
        await db
          .update(adminConfig)
          .set({ totpSecret: encrypted, updatedAt: new Date() })
          .where(eq(adminConfig.id, config.id))
          .catch((e) => console.error('[Admin Login] Failed to encrypt TOTP secret:', e));
      }
    }

    const token = await signAdminSession();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    });
    return response;
  } catch (err) {
    console.error('[Admin Login]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
