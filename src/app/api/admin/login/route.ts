import { NextResponse } from 'next/server';
import { db, safeQuery } from '@/lib/db/client';
import { adminConfig } from '@/lib/db/schema/admin';
import { signAdminSession, SESSION_COOKIE } from '@/lib/admin/session';
import * as OTPAuth from 'otpauth';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { password, code } = await req.json();

    if (!password || !code) {
      return NextResponse.json({ error: 'Missing password or code' }, { status: 400 });
    }

    // Fetch admin config
    const [config] = await safeQuery(db.select().from(adminConfig).limit(1));
    if (!config || !config.isSetup) {
      return NextResponse.json({ error: 'Admin not configured. Please complete setup first.' }, { status: 403 });
    }

    // Step 1: Verify password
    const passwordValid = await bcrypt.compare(password, config.passwordHash);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Step 2: Verify TOTP code
    const totp = new OTPAuth.TOTP({
      issuer: 'AkiliHub',
      label: 'Admin',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: config.totpSecret
    });

    const isValidCode = totp.validate({ token: code, window: 1 }) !== null;

    if (!isValidCode) {
      return NextResponse.json({ error: 'Invalid authenticator code' }, { status: 401 });
    }

    // Issue session cookie
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
  } catch (err: any) {
    console.error('[Admin Login]', err);
    return NextResponse.json({ error: 'Internal error', message: err.message }, { status: 500 });
  }
}
