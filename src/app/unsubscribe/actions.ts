'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema/users';
import { isUuid } from '@/lib/cv-session';
import { allowByHeaders } from '@/lib/security/rate-limit';

/**
 * Changes an email preference. This only ever runs from a form POST (a deliberate click) —
 * never while rendering a page — so link scanners and prefetchers cannot unsubscribe anyone.
 */
export async function setEmailPreference(formData: FormData) {
  const userId = String(formData.get('user_id') ?? '');
  const intent = formData.get('intent') === 'resubscribe' ? 'resubscribe' : 'unsubscribe';

  if (!isUuid(userId)) redirect('/unsubscribe?error=invalid');
  if (!(await allowByHeaders(await headers(), { prefix: 'email-preference', max: 10, window: '10 m' }))) {
    redirect(`/unsubscribe?user_id=${userId}&error=busy`);
  }

  try {
    await db
      .update(users)
      .set({ emailUpdates: intent === 'resubscribe', updatedAt: new Date() })
      .where(eq(users.id, userId));
  } catch (err) {
    console.error('Failed to update email preference:', err);
    redirect(`/unsubscribe?user_id=${userId}&error=failed`);
  }

  redirect(`/unsubscribe?user_id=${userId}&done=${intent === 'resubscribe' ? 'resubscribed' : 'unsubscribed'}`);
}
