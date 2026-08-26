import { NextResponse } from 'next/server';
import { db, safeQuery } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { tenders } from '@/lib/db/schema/tenders';
import { countries } from '@/lib/db/schema/shared';
import { guides } from '@/lib/db/schema/guides';
import { count, eq, and, isNull, gt, or } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const start = Date.now();

  try {
    const [jobCount, tenderCount, countryCount, guideCount] = await Promise.all([
      safeQuery(
        db.select({ value: count() }).from(jobs).where(
          and(eq(jobs.isActive, true), or(isNull(jobs.deadline), gt(jobs.deadline, new Date())))
        )
      ),
      safeQuery(db.select({ value: count() }).from(tenders).where(eq(tenders.status, 'open'))),
      safeQuery(db.select({ value: count() }).from(countries)),
      safeQuery(db.select({ value: count() }).from(guides).where(eq(guides.isPublished, true))),
    ]);

    const latencyMs = Date.now() - start;

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '1.0.0',
      db: 'connected',
      latency_ms: latencyMs,
      counts: {
        active_jobs: jobCount?.[0]?.value ?? 0,
        open_tenders: tenderCount?.[0]?.value ?? 0,
        countries: countryCount?.[0]?.value ?? 0,
        published_guides: guideCount?.[0]?.value ?? 0,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        db: 'unreachable',
        error: err instanceof Error ? err.message : 'unknown',
        latency_ms: Date.now() - start,
      },
      { status: 503 }
    );
  }
}
