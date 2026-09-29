import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema/users';
import { isUuid } from '@/lib/cv-session';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET is what a human's browser (or a mail scanner!) hits, so it must NEVER change anything:
 * it just sends people to the confirmation page.
 */
export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get('user_id');
  if (!isUuid(userId)) return new NextResponse('Missing or invalid user_id parameter', { status: 400 });
  return NextResponse.redirect(new URL(`/unsubscribe?user_id=${userId}`, request.url), 303);
}

/** RFC 8058 one-click unsubscribe: mail clients POST `List-Unsubscribe=One-Click` to the header URL. */
export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, { prefix: 'unsubscribe', max: 30, window: '10 m' });
  if (limited) return limited;

  const userId = new URL(request.url).searchParams.get('user_id');
  if (!isUuid(userId)) return new NextResponse('Missing or invalid user_id parameter', { status: 400 });

  try {
    await db.update(users).set({ emailUpdates: false, updatedAt: new Date() }).where(eq(users.id, userId));
    return new NextResponse('Unsubscribed', { status: 200 });
  } catch (error) {
    console.error('Failed to unsubscribe user:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
