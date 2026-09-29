import { NextResponse } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { users, userAlerts, bookmarks } from '@/lib/db/schema/users';
import { jobApplications, mockInterviews } from '@/lib/db/schema/applications';
import { createClient } from '@/lib/supabase/server';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

/** Data portability / access: everything we hold about the signed-in user, as a JSON download. */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limited = await enforceRateLimit(req, { prefix: 'account-export', max: 5, window: '1 h', key: user.id });
  if (limited) return limited;

  const [profile] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const alerts = await db.select().from(userAlerts).where(eq(userAlerts.userId, user.id));
  const saved = await db.select().from(bookmarks).where(eq(bookmarks.userId, user.id));
  const applications = await db.select().from(jobApplications).where(eq(jobApplications.userId, user.id));
  const interviews = applications.length
    ? await db.select().from(mockInterviews).where(inArray(mockInterviews.applicationId, applications.map((a) => a.id)))
    : [];

  const payload = {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email, createdAt: user.created_at },
    profile: profile ?? null,
    alerts,
    savedItems: saved,
    jobApplications: applications,
    mockInterviews: interviews,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="akilibrain-my-data.json"',
      'Cache-Control': 'no-store',
    },
  });
}
