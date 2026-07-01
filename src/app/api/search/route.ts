import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { tenders } from '@/lib/db/schema/tenders';
import { complianceRequirements } from '@/lib/db/schema/compliance';
import { salarySubmissions } from '@/lib/db/schema/salaries';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  module: 'tenders' | 'compliance' | 'salaries' | 'health';
  url: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  const tsQuery = query.trim().split(' ').join(' & ');

  try {
    // Run parallel FTS across all modules
    const [tenderResults, complianceResults, salaryResults] = await Promise.all([
      db.select({
        id: tenders.id,
        title: tenders.title,
        description: tenders.contractingAuthority,
      })
        .from(tenders)
        .where(sql`to_tsvector('english', ${tenders.title} || ' ' || coalesce(${tenders.description}, '')) @@ plainto_tsquery('english', ${query})`)
        .limit(5),

      db.select({
        id: complianceRequirements.id,
        title: complianceRequirements.title,
        description: complianceRequirements.issuingAuthority,
      })
        .from(complianceRequirements)
        .where(sql`to_tsvector('english', ${complianceRequirements.title} || ' ' || ${complianceRequirements.description}) @@ plainto_tsquery('english', ${query})`)
        .limit(5),

      db.select({
        id: salarySubmissions.id,
        title: salarySubmissions.jobTitle,
        description: salarySubmissions.currency,
      })
        .from(salarySubmissions)
        .where(sql`to_tsvector('english', ${salarySubmissions.jobTitle}) @@ plainto_tsquery('english', ${query})`)
        .limit(5),
    ]);

    const results: SearchResult[] = [
      ...tenderResults.map(r => ({ ...r, module: 'tenders' as const, url: `/procurement/${r.id}`, description: r.description ?? '' })),
      ...complianceResults.map(r => ({ ...r, module: 'compliance' as const, url: `/compliance/${r.id}`, description: r.description ?? '' })),
      ...salaryResults.map(r => ({ ...r, module: 'salaries' as const, url: `/salaries`, description: r.description ?? '' })),
    ];

    return NextResponse.json({ results });
  } catch (error) {
    console.error('[Search API Error]', error);
    return NextResponse.json({ results: [], error: 'Search failed' }, { status: 500 });
  }
}
