import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { salarySubmissions } from '@/lib/db/schema/salaries';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const verifySchema = z.object({
  id: z.string().uuid(),
  verified: z.boolean(),
});

/**
 * PATCH /api/salaries/verify
 * Admin-only endpoint to mark a salary submission as verified or unverified.
 * Protected by the ADMIN_SECRET env variable.
 */
export async function PATCH(req: NextRequest) {
  // Simple secret-based auth guard
  const authHeader = req.headers.get('x-admin-secret');
  if (!authHeader || authHeader !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
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
