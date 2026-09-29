import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { salarySubmissions } from '@/lib/db/schema/salaries';
import { SESSION_COOKIE, verifyAdminSession } from '@/lib/admin/session';
import { safeEqual } from '@/lib/security/secrets';

const verifySchema = z.object({
  id: z.string().uuid(),
  verified: z.boolean(),
});

async function authorized(req: NextRequest): Promise<boolean> {
  // Admin session cookie (preferred)…
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token && (await verifyAdminSession(token))) return true;
  // …or the static ADMIN_SECRET header for scripts (constant-time compare).
  return safeEqual(req.headers.get('x-admin-secret'), process.env.ADMIN_SECRET);
}

/**
 * PATCH /api/salaries/verify
 * Admin-only endpoint to mark a salary submission as verified or unverified.
 */
export async function PATCH(req: NextRequest) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { id, verified } = parsed.data;

  const [updated] = await db
    .update(salarySubmissions)
    .set({ isVerified: verified })
    .where(eq(salarySubmissions.id, id))
    .returning({ id: salarySubmissions.id, isVerified: salarySubmissions.isVerified });

  if (!updated) {
    return NextResponse.json({ error: 'Salary submission not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, id: updated.id, isVerified: updated.isVerified });
}
