import { db } from '../db/client';
import { tenders } from '../db/schema/tenders';
import { countries } from '../db/schema/shared';
import { eq } from 'drizzle-orm';

/**
 * Uganda — PPDA via the Government Procurement Portal (GPP)
 * Official OCDS portal: https://gpp.ppda.go.ug
 * Publishes JSON datasets of active tenders.
 */
export async function scrapePPDAUganda(): Promise<number> {
  const apiUrls = [
    'https://gpp.ppda.go.ug/api/v1/tenders?status=active&format=json&limit=50',
    'https://gpp.ppda.go.ug/tenders.json?limit=50',
    'https://www.ppda.go.ug/api/tenders?status=active&format=json',
  ];
  const fallbackUrl = 'https://www.ppda.go.ug/public-notices/';

  try {
    let rawTenders: any[] = [];

    for (const url of apiUrls) {
      try {
        console.log(`[PPDA Uganda] Trying API endpoint: ${url}`);
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
          console.log(`[PPDA Uganda] Got ${rawTenders.length} tenders from ${url}`);
          break;
        }
      } catch (err) {
        console.log(`[PPDA Uganda] Endpoint ${url} failed:`, (err as Error).message);
      }
    }

    // Fallback: Firecrawl the public notices page
    if (rawTenders.length === 0) {
      const { FirecrawlStrategy } = await import('../strategies/scraper-strategies');
      const fc = new FirecrawlStrategy();
      try {
        console.log(`[PPDA Uganda] Trying Firecrawl on ${fallbackUrl}...`);
        const { result } = await fc.execute({ url: fallbackUrl, portalType: 'ppda_ug' });
        rawTenders = result ?? [];
        console.log(`[PPDA Uganda] Firecrawl returned ${rawTenders.length} tenders.`);
      } catch (err) {
        console.log('[PPDA Uganda] Firecrawl fallback failed:', (err as Error).message);
      }
    }

    if (rawTenders.length === 0) {
      console.log('[PPDA Uganda] No data found. Skipping.');
      return 0;
    }

    const [ug] = await db
      .select({ id: countries.id })
      .from(countries)
      .where(eq(countries.code, 'UG'))
      .limit(1);

    if (!ug) {
      console.warn('[PPDA Uganda] Uganda country record not found.');
      return 0;
    }

    const formattedTenders = rawTenders
      .map((t: any) => {
        const title = t.title ?? t.subject ?? t.name ?? null;
        if (!title) return null;
        return {
          title,
          referenceNo: t.referenceNo ?? t.reference_no ?? t.id ?? `UG-TND-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          description: t.description ?? null,
          contractingAuthority: t.contractingAuthority ?? t.contracting_authority ?? t.entity ?? 'PPDA Uganda',
          countryId: ug.id,
          publishedAt: new Date(t.publishedAt ?? t.publishedDate ?? t.published_at ?? Date.now()),
          deadline: new Date(t.deadline ?? t.closingDate ?? t.closing_date ?? Date.now() + 86400000 * 30),
          sourceUrl: t.sourceUrl ?? t.url ?? fallbackUrl,
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

    console.log(`[PPDA Uganda] Inserted ${inserted.length} new Uganda tenders.`);
    return inserted.length;
  } catch (error) {
    console.error('[PPDA Uganda] Fatal error:', error);
    return 0;
  }
}