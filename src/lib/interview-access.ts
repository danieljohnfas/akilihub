import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { jobApplications } from '@/lib/db/schema/applications';
import { jobs } from '@/lib/db/schema/jobs';

export type InterviewAccess =
  | { ok: true; app: typeof jobApplications.$inferSelect; job: typeof jobs.$inferSelect }
  | { ok: false; status: 403 | 404; error: string };

/**
 * Loads an application + its job for the signed-in user.
 * Ownership is strict: applications with no owner (legacy anonymous rows) are NOT
 * accessible to every signed-in user (the old check `app.userId && app.userId !== user.id`
 * let anyone through when `userId` was null).
 */
export async function loadOwnedApplication(applicationId: string, userId: string): Promise<InterviewAccess> {
  const [app] = await db.select().from(jobApplications).where(eq(jobApplications.id, applicationId)).limit(1);
  if (!app) return { ok: false, status: 404, error: 'Application not found' };
  if (app.userId !== userId) return { ok: false, status: 403, error: 'Forbidden' };

  const [job] = await db.select().from(jobs).where(eq(jobs.id, app.jobId)).limit(1);
  if (!job) return { ok: false, status: 404, error: 'The job for this application is no longer available' };
  return { ok: true, app, job };
}
