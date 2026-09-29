'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema/users';
import { isUuid } from '@/lib/cv-session';
import { allowByHeaders } from '@/lib/security/rate-limit';
import { verifyToken } from '@/lib/security/tokens';

/** Completes double opt-in. Runs on POST (button click), so link scanners that only GET cannot confirm. */
export async function confirmSubscription(formData: FormData) {
  const userId = String(formData.get('u') ?? '');
  const token = String(formData.get('t') ?? '');

  if (!isUuid(userId) || !verifyToken('confirm', userId, token)) {
    redirect('/subscribe/confirm?status=invalid');
  }
  if (!(await allowByHeaders(await headers(), { prefix: 'subscribe-confirm', max: 10, window: '10 m' }))) {
    redirect('/subscribe/confirm?status=busy');
  }

  let email: string | undefined;
  try {
    const [row] = await db
      .update(users)
      .set({ emailUpdates: true, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ email: users.email });
    email = row?.email;
  } catch (err) {
    console.error('[subscribe/confirm] update failed:', err);
    redirect('/subscribe/confirm?status=error');
  }

  if (!email) redirect('/subscribe/confirm?status=invalid');

  // Add to the Resend audience only now that consent is confirmed.
  if (process.env.RESEND_API_KEY && process.env.RESEND_AUDIENCE_ID) {
    try {
      await new Resend(process.env.RESEND_API_KEY).contacts.create({
        email,
        audienceId: process.env.RESEND_AUDIENCE_ID,
        unsubscribed: false,
      });
    } catch (err) {
      console.warn('[subscribe/confirm] Resend audience add failed (non-fatal):', err);
    }
  }

  redirect('/subscribe/confirm?status=done');
}
