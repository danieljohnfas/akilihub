import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { Resend } from 'resend';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema/users';
import { enforceRateLimit } from '@/lib/security/rate-limit';
import { signToken } from '@/lib/security/tokens';

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://akilibrain.com').replace(/\/$/, '');

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  fullName: z.string().trim().max(100).optional(),
  // Honeypot: real users never see or fill this field.
  website: z.string().optional(),
});

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ACCEPTED = {
  success: true,
  pendingConfirmation: true,
  message: 'Almost done! Check your inbox and click the confirmation link to start receiving updates.',
};

/**
 * Newsletter signup with double opt-in.
 *
 * - Nobody is subscribed until they click the emailed confirmation link, so a stranger cannot
 *   enrol (or re-enrol after an unsubscribe) somebody else's address.
 * - The response is identical whether or not the address is already known (no enumeration).
 * - Rate-limited per IP and per address so this cannot be used to mail-bomb a victim.
 */
export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, { prefix: 'subscribe', max: 5, window: '10 m' });
  if (limited) return limited;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  const { email, fullName, website } = parsed.data;

  if (website) return NextResponse.json(ACCEPTED); // bot: pretend success, do nothing

  const perAddress = await enforceRateLimit(req, { prefix: 'subscribe-email', max: 3, window: '1 h', key: email });
  if (perAddress) return perAddress;

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not configured.');
    return NextResponse.json({ error: 'Email service is not configured.' }, { status: 503 });
  }

  try {
    const [existing] = await db
      .select({ id: users.id, emailUpdates: users.emailUpdates })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let userId: string;
    let needsConfirmation: boolean;

    if (existing) {
      userId = existing.id;
      needsConfirmation = !existing.emailUpdates; // already subscribed → nothing to send
    } else {
      userId = randomUUID();
      // Newsletter-only row: consent stays OFF until confirmed. welcomeEmailSent=true stops the
      // 15-minute welcome job from also mailing this address.
      const inserted = await db
        .insert(users)
        .values({ id: userId, email, fullName: fullName ?? null, emailUpdates: false, welcomeEmailSent: true })
        .onConflictDoNothing()
        .returning({ id: users.id });
      if (inserted.length === 0) {
        // Lost a race with a concurrent signup for the same address.
        const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
        userId = row?.id ?? userId;
      }
      needsConfirmation = true;
    }

    if (needsConfirmation) {
      const confirmUrl = `${BASE_URL}/subscribe/confirm?u=${encodeURIComponent(userId)}&t=${signToken('confirm', userId)}`;
      const greeting = fullName ? `Hi ${escapeHtml(fullName.split(' ')[0])},` : 'Hi,';
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: 'AkiliBrain <alerts@akilibrain.com>',
        to: [email],
        subject: 'Confirm your AkiliBrain subscription',
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
            <h2 style="margin-top: 0; color: #0f172a;">Confirm your subscription</h2>
            <p>${greeting}</p>
            <p>Someone (hopefully you) asked to receive AkiliBrain updates — new tenders, jobs and compliance notices across East &amp; Central Africa — at this address.</p>
            <p style="margin: 24px 0;">
              <a href="${confirmUrl}" style="background:#0f172a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Yes, subscribe me</a>
            </p>
            <p style="font-size: 12px; color: #64748b;">If you did not request this, ignore this email — you will not be subscribed and will not hear from us again.</p>
          </div>`,
      });
      if (error) {
        console.error('Resend API error:', error);
        return NextResponse.json({ error: 'We could not send the confirmation email. Please try again later.' }, { status: 502 });
      }
    }

    return NextResponse.json(ACCEPTED);
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
