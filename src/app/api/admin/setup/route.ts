import { NextResponse } from 'next/server';
import { asc, eq, sql } from 'drizzle-orm';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db/client';
import { adminConfig } from '@/lib/db/schema/admin';
import { encryptSecret } from '@/lib/admin/crypto';
import { safeEqual } from '@/lib/security/secrets';
import { enforceRateLimit } from '@/lib/security/rate-limit';

/**
 * First-run admin bootstrap.
 *
 * Hardening:
 *  - Requires ADMIN_SETUP_TOKEN (sent as `x-setup-token`). In production the
 *    endpoint is disabled entirely when the token is not configured, so nobody
 *    can claim the admin account by being the first visitor.
 *  - Fails closed: DB errors are surfaced (never treated as "not set up").
 *  - The check-and-insert runs in one transaction under an advisory lock.
 */

const SETUP_LOCK_ID = 727_001; // arbitrary constant for pg_advisory_xact_lock

function setupGate(req: Request): NextResponse | null {
  const expected = process.env.ADMIN_SETUP_TOKEN;
  if (!expected) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Admin setup is disabled. Set ADMIN_SETUP_TOKEN on the server to enable it.' },
        { status: 403 }
      );
    }
    return null; // local development convenience
  }
  if (!safeEqual(req.headers.get('x-setup-token'), expected)) {
    return NextResponse.json({ error: 'Invalid setup token.' }, { status: 401 });
  }
  return null;
}

export async function GET(req: Request) {
  const limited = await enforceRateLimit(req, { prefix: 'admin-setup', max: 10, window: '15 m' });
  if (limited) return limited;
  const denied = setupGate(req);
  if (denied) return denied;

  try {
    const [existing] = await db
      .select({ isSetup: adminConfig.isSetup })
      .from(adminConfig)
      .orderBy(asc(adminConfig.createdAt))
      .limit(1);
    if (existing?.isSetup) {
      return NextResponse.json({ error: 'Setup already completed. Contact DB admin to reset.' }, { status: 403 });
    }

    const totp = new OTPAuth.TOTP({
      issuer: 'AkiliHub',
      label: 'Admin',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: new OTPAuth.Secret({ size: 20 }),
    });

    const qrDataUrl = await QRCode.toDataURL(totp.toString());
    return NextResponse.json({ secret: totp.secret.base32, qrDataUrl, otpAuthUrl: totp.toString() });
  } catch (err) {
    console.error('[Admin Setup GET]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, { prefix: 'admin-setup', max: 10, window: '15 m' });
  if (limited) return limited;
  const denied = setupGate(req);
  if (denied) return denied;

  try {
    const body = await req.json().catch(() => null);
    const secret = typeof body?.secret === 'string' ? body.secret : '';
    const code = typeof body?.code === 'string' ? body.code.replace(/\s/g, '') : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!secret || !code || !password) {
      return NextResponse.json({ error: 'Missing secret, code, or password' }, { status: 400 });
    }
    if (password.length < 12 || password.length > 200) {
      return NextResponse.json({ error: 'Password must be 12–200 characters' }, { status: 400 });
    }

    const totp = new OTPAuth.TOTP({
      issuer: 'AkiliHub',
      label: 'Admin',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });
    if (totp.validate({ token: code, window: 1 }) === null) {
      return NextResponse.json({ error: 'Invalid authenticator code' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const totpSecret = encryptSecret(secret);

    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${SETUP_LOCK_ID})`);
      const [existing] = await tx
        .select({ id: adminConfig.id, isSetup: adminConfig.isSetup })
        .from(adminConfig)
        .orderBy(asc(adminConfig.createdAt))
        .limit(1);

      if (existing?.isSetup) return 'already' as const;

      if (existing) {
        await tx
          .update(adminConfig)
          .set({ totpSecret, passwordHash, isSetup: true, updatedAt: new Date() })
          .where(eq(adminConfig.id, existing.id));
      } else {
        await tx.insert(adminConfig).values({ totpSecret, passwordHash, isSetup: true });
      }
      return 'created' as const;
    });

    if (result === 'already') {
      return NextResponse.json({ error: 'Setup already completed.' }, { status: 403 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Admin Setup POST]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
