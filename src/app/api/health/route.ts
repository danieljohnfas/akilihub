import { NextResponse } from 'next/server';
import { count, eq, and, isNull, gt, or, sql } from 'drizzle-orm';
import { db, queryOrThrow } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { tenders } from '@/lib/db/schema/tenders';
import { countries } from '@/lib/db/schema/shared';
import { guides } from '@/lib/db/schema/guides';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Liveness/readiness probe.
 *
 * Default (`GET /api/health`) is deliberately cheap — one `SELECT 1` — so uptime monitors and
 * Docker healthchecks can call it often. It returns 503 when the database is unreachable
 * (it used to always say "ok" because safeQuery swallowed every error).
 * `GET /api/health?full=1` adds content counts.
 */
export async function GET(request: Request) {
  const start = Date.now();
  const full = new URL(request.url).searchParams.get('full') === '1';

  try {
    await queryOrThrow(db.execute(sql`SELECT 1`), 5000, 'health ping');

    let counts: Record<string, number> | undefined;
    if (full) {
      const [jobCount, tenderCount, countryCount, guideCount] = await Promise.all([
        queryOrThrow(
          db.select({ value: count() }).from(jobs).where(and(eq(jobs.isActive, true), or(isNull(jobs.deadline), gt(jobs.deadline, new Date())))),
          8000,
          'health jobs'
        ),
        queryOrThrow(db.select({ value: count() }).from(tenders).where(eq(tenders.status, 'open')), 8000, 'health tenders'),
        queryOrThrow(db.select({ value: count() }).from(countries), 8000, 'health countries'),
        queryOrThrow(db.select({ value: count() }).from(guides).where(eq(guides.isPublished, true)), 8000, 'health guides'),
      ]);
      counts = {
        active_jobs: jobCount[0]?.value ?? 0,
        open_tenders: tenderCount[0]?.value ?? 0,
        countries: countryCount[0]?.value ?? 0,
        published_guides: guideCount[0]?.value ?? 0,
      };
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: 'connected',
      latency_ms: Date.now() - start,
      ...(counts ? { counts } : {}),
    });
  } catch (err) {
    console.error('[health] database check failed:', err);
    return NextResponse.json(
      { status: 'error', timestamp: new Date().toISOString(), db: 'unreachable', latency_ms: Date.now() - start },
      { status: 503 }
    );
  }
}
