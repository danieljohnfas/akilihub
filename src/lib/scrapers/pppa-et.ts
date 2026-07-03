import { db } from '../db/client';
import { tenders } from '../db/schema/tenders';
import { countries } from '../db/schema/shared';
import { eq } from 'drizzle-orm';

/**
 * Ethiopia — Federal Public Procurement & Property Administration (PPA)
 * Uses the official e-Government Procurement (e-GP) portal API.
 * Correct URL: https://egp.ppa.gov.et (not www.pppa.gov.et which is defunct)
 */
export async function scrapePPPAEthiopia(): Promise<number> {
  const apiUrls = [
    'https://egp.ppa.gov.et/api/v1/tenders?status=open&format=json',
    'https://egp.ppa.gov.et/tenders/open.json',
    // Fallback: scrape the public bid list page via Firecrawl
    'https://egp.ppa.gov.et/bids',
  ];

  try {
    let rawTenders: any[] = [];

    // Try JSON API endpoints first
    for (const url of apiUrls.slice(0, 2)) {
      try {
        console.log(`[PPPA Ethiopia] Trying API endpoint: ${url}`);
        const res = await fetch(url, {
          headers: { Accept: 'application/json', 'User-Agent': 'AkiliBrain/1.0' },
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) continue;
        const contentType = res.headers.get('content-type') ?? '';
        if (!contentType.includes('json')) continue;
        const data = await res.json();
        rawTenders = Array.isArray(data) ? data : data?.tenders ?? data?.results ?? data?.data ?? [];
        if (rawTenders.length > 0) {
          console.log(`[PPPA Ethiopia] Got ${rawTenders.length} tenders from ${url}`);
          break;
        }
      } catch (err) {
        console.log(`[PPPA Ethiopia] Endpoint ${url} failed:`, (err as Error).message);
      }
    }

    // Fallback: try Firecrawl on the correct public bid portal
    if (rawTenders.length === 0) {
      const { FirecrawlStrategy } = await import('../strategies/scraper-strategies');
      const fc = new FirecrawlStrategy();
      try {
        console.log('[PPPA Ethiopia] Trying Firecrawl on egp.ppa.gov.et/bids...');
        const result = await fc.execute({ url: 'https://egp.ppa.gov.et/bids', portalType: 'pppa_et' });
        rawTenders = result ?? [];
        console.log(`[PPPA Ethiopia] Firecrawl extracted ${rawTenders.length} potential tenders.`);
      } catch (err) {
        console.log('[PPPA Ethiopia] Firecrawl fallback also failed:', (err as Error).message);
      }
    }

    if (rawTenders.length === 0) {
      console.log('[PPPA Ethiopia] No data found from any source. Skipping.');
      return 0;
    }

    const [et] = await db
      .select({ id: countries.id })
      .from(countries)
      .where(eq(countries.code, 'ET'))
      .limit(1);

    if (!et) {
      console.warn('[PPPA Ethiopia] Ethiopia country record not found.');
      return 0;
    }

    const formattedTenders = rawTenders
      .map((t: any) => {
        const title = t.title ?? t.subject ?? t.description ?? null;
        if (!title) return null;
        return {
          title,
          referenceNo: t.referenceNo ?? t.reference_no ?? t.bidNo ?? t.id ?? `ET-TND-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          description: t.description ?? null,
          contractingAuthority: t.contractingAuthority ?? t.contracting_authority ?? t.entity ?? 'PPA Ethiopia',
          countryId: et.id,
          publishedAt: new Date(t.publishedAt ?? t.published_at ?? t.openingDate ?? Date.now()),
          deadline: new Date(t.deadline ?? t.closingDate ?? t.closing_date ?? Date.now() + 86400000 * 30),
          sourceUrl: t.sourceUrl ?? t.url ?? 'https://egp.ppa.gov.et/bids',
          status: 'open' as const,
        };
      })
      .filter(Boolean) as any[];

    if (formattedTenders.length === 0) return 0;

    const inserted = await db
      .insert(tenders)
      .values(formattedTenders)
      .onConflictDoNothing({ target: tenders.referenceNo })
      .returning({ id: tenders.id });

    console.log(`[PPPA Ethiopia] Inserted ${inserted.length} new Ethiopia tenders.`);
    return inserted.length;
  } catch (error) {
    console.error('[PPPA Ethiopia] Fatal error:', error);
    return 0;
  }
}
