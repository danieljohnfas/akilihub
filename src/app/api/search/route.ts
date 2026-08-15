import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { tenders } from '@/lib/db/schema/tenders';
import { complianceRequirements } from '@/lib/db/schema/compliance';
import { salarySubmissions } from '@/lib/db/schema/salaries';
import { jobs } from '@/lib/db/schema/jobs';
import { sql, and, eq, or, isNull, gte } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  module: 'tenders' | 'compliance' | 'salaries' | 'jobs';
  url: string;
}

export async function GET(request: Request) {
  let query = '';
  let page = 1;
  let limit = 5;
  try {
    const url = new URL(request.url || 'http://localhost/api/search');
    query = url.searchParams.get('q') || '';
    page = parseInt(url.searchParams.get('page') || '1', 10);
    limit = parseInt(url.searchParams.get('limit') || '5', 10);
    if (page < 1) page = 1;
    if (limit < 1 || limit > 50) limit = 5;
  } catch (e) {
    return NextResponse.json({ results: [] });
  }

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  const offset = (page - 1) * limit;

  try {
    const now = new Date();

    // Run parallel FTS across all 4 modules
    const [tenderResults, complianceResults, salaryResults, jobResults] = await Promise.all([
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

      db.select({
        id: complianceRequirements.id,
        title: complianceRequirements.title,
        description: complianceRequirements.issuingAuthority,
      })
        .from(complianceRequirements)
        .where(sql`to_tsvector('english', ${complianceRequirements.title} || ' ' || ${complianceRequirements.description}) @@ plainto_tsquery('english', ${query})`)
        .limit(limit).offset(offset),

      db.select({
        id: salarySubmissions.id,
        title: salarySubmissions.jobTitle,
        description: salarySubmissions.currency,
      })
        .from(salarySubmissions)
        .where(sql`to_tsvector('english', ${salarySubmissions.jobTitle}) @@ plainto_tsquery('english', ${query})`)
        .limit(limit).offset(offset),

      // ✅ Jobs — now included in global search
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
