import { NextResponse } from 'next/server';
import { db, safeQuery } from '@/lib/db/client';
import { adminConfig } from '@/lib/db/schema/admin';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    // Check if already set up
    const [existing] = await safeQuery(db.select({ isSetup: adminConfig.isSetup }).from(adminConfig).limit(1));
    if (existing?.isSetup) {
      return NextResponse.json({ error: 'Setup already completed. Contact DB admin to reset.' }, { status: 403 });
    }

    // Generate new secret for setup
    const totp = new OTPAuth.TOTP({
      issuer: 'AkiliHub',
      label: 'Admin',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: new OTPAuth.Secret({ size: 20 })
    });
    
    const secret = totp.secret.base32;
    const otpAuthUrl = totp.toString();

    // Generate QR Code data URL
    const qrDataUrl = await QRCode.toDataURL(otpAuthUrl);

    return NextResponse.json({ secret, qrDataUrl, otpAuthUrl });
  } catch (err: any) {
    console.error('[Admin Setup GET]', err);
    return NextResponse.json({ error: 'Internal error', message: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { secret, code, password } = await req.json();

    if (!secret || !code || !password) {
      return NextResponse.json({ error: 'Missing secret, code, or password' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Check not already set up
    const [existing] = await safeQuery(db.select({ isSetup: adminConfig.isSetup }).from(adminConfig).limit(1));
    if (existing?.isSetup) {
      return NextResponse.json({ error: 'Setup already completed.' }, { status: 403 });
    }

    // 2. Verify TOTP code
    const totp = new OTPAuth.TOTP({
      issuer: 'AkiliHub',
      label: 'Admin',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret
    });

    const isValidCode = totp.validate({ token: code, window: 1 }) !== null;

    if (!isValidCode) {
      return NextResponse.json({ error: 'Invalid authenticator code' }, { status: 400 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Save to DB (upsert)
    if (existing) {
      await db.update(adminConfig).set({
        totpSecret: secret,
        passwordHash,
        isSetup: true,
        updatedAt: new Date(),
      }).where(eq(adminConfig.id, existing.id as never));
    } else {
      await db.insert(adminConfig).values({
        totpSecret: secret,
        passwordHash,
        isSetup: true,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[Admin Setup POST]', err);
    return NextResponse.json({ error: 'Internal error', message: err.message }, { status: 500 });
  }
}
