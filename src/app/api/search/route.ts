import { NextResponse } from 'next/server';
import { db, safeQuery } from '@/lib/db/client';
import { tenders } from '@/lib/db/schema/tenders';
import { complianceRequirements } from '@/lib/db/schema/compliance';
import { salarySubmissions } from '@/lib/db/schema/salaries';
import { jobs } from '@/lib/db/schema/jobs';
import { sql, and, eq, or, isNull, gte } from 'drizzle-orm';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  module: 'tenders' | 'compliance' | 'salaries' | 'jobs';
  url: string;
}

export async function GET(request: Request) {
  // Public, unauthenticated and DB-heavy (4 full-text queries per call): cap per IP.
  const limited = await enforceRateLimit(request, { prefix: 'search', max: 40, window: '1 m' });
  if (limited) return limited;

  const url = new URL(request.url);
  const query = (url.searchParams.get('q') || '').trim().slice(0, 200);

  // parseInt('abc') is NaN, and NaN slips through `< 1` / `> 50` checks — normalise explicitly.
  const toInt = (raw: string | null, fallback: number) => {
    const n = parseInt(raw ?? '', 10);
    return Number.isFinite(n) ? n : fallback;
  };
  const page = Math.min(Math.max(toInt(url.searchParams.get('page'), 1), 1), 100);
  const requestedLimit = toInt(url.searchParams.get('limit'), 5);
  const limit = requestedLimit >= 1 && requestedLimit <= 50 ? requestedLimit : 5;

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const offset = (page - 1) * limit;

  try {
    const now = new Date();

    // Run parallel resilient FTS across all 4 modules (6s timeout per module)
    const [tenderResults, complianceResults, salaryResults, jobResults] = await Promise.all([
      safeQuery(
        db.select({
          id: tenders.id,
          title: tenders.title,
          description: tenders.contractingAuthority,
        })
          .from(tenders)
          .where(
            and(
              eq(tenders.status, 'open'),
              or(isNull(tenders.deadline), gte(tenders.deadline, now)),
              sql`to_tsvector('english', ${tenders.title} || ' ' || coalesce(${tenders.description}, '')) @@ plainto_tsquery('english', ${query})`
            )
          )
          .limit(limit).offset(offset),
        6000,
        'Search tenders'
      ),

      safeQuery(
        db.select({
          id: complianceRequirements.id,
          title: complianceRequirements.title,
          description: complianceRequirements.issuingAuthority,
        })
          .from(complianceRequirements)
          .where(sql`to_tsvector('english', ${complianceRequirements.title} || ' ' || coalesce(${complianceRequirements.description}, '')) @@ plainto_tsquery('english', ${query})`)
          .limit(limit).offset(offset),
        6000,
        'Search compliance'
      ),

      safeQuery(
        db.select({
          id: salarySubmissions.id,
          title: salarySubmissions.jobTitle,
          description: salarySubmissions.currency,
        })
          .from(salarySubmissions)
          .where(sql`to_tsvector('english', ${salarySubmissions.jobTitle}) @@ plainto_tsquery('english', ${query})`)
          .limit(limit).offset(offset),
        6000,
        'Search salaries'
      ),

      // ✅ Jobs — included in global search with safeQuery
      safeQuery(
        db.select({
          id: jobs.id,
          title: jobs.title,
          description: jobs.companyName,
        })
          .from(jobs)
          .where(
            and(
              eq(jobs.isActive, true),
              or(isNull(jobs.deadline), gte(jobs.deadline, now)),
              sql`to_tsvector('english', ${jobs.title} || ' ' || coalesce(${jobs.description}, '')) @@ plainto_tsquery('english', ${query})`
            )
          )
          .limit(limit).offset(offset),
        6000,
        'Search jobs'
      ),
    ]);

    const results: SearchResult[] = [
      ...tenderResults.map(r => ({ ...r, module: 'tenders' as const, url: `/tenders/${r.id}`, description: r.description ?? '' })),
      ...complianceResults.map(r => ({ ...r, module: 'compliance' as const, url: `/compliance/${r.id}`, description: r.description ?? '' })),
      ...salaryResults.map(r => ({ ...r, module: 'salaries' as const, url: `/salaries`, description: r.description ?? '' })),
      ...jobResults.map(r => ({ ...r, module: 'jobs' as const, url: `/jobs/${r.id}`, description: r.description ?? '' })),
    ];

    return NextResponse.json({ results });
  } catch (error) {
    console.error('[Search API Error]', error);
    return NextResponse.json({ results: [], error: 'Search failed' }, { status: 500 });
  }
}
