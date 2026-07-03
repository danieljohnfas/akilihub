import { db } from '../db/client';
import { tenders } from '../db/schema/tenders';
import { countries } from '../db/schema/shared';
import { eq } from 'drizzle-orm';

/**
 * Rwanda — Rwanda Public Procurement Authority (RPPA)
 * Portal: https://www.rppa.gov.rw
 * Rwanda's e-GP system (Umucyo) exposes a structured API.
 */
export async function scrapeRPPARwanda(): Promise<number> {
  const apiUrls = [
    'https://umucyo.gov.rw/api/v1/tenders?status=open&format=json',
    'https://www.rppa.gov.rw/api/tenders?format=json',
  ];
  const fallbackUrl = 'https://www.rppa.gov.rw/index.php?id=tender';

  try {
    let rawTenders: any[] = [];

    for (const url of apiUrls) {
      try {
        console.log(`[RPPA Rwanda] Trying API endpoint: ${url}`);
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
          console.log(`[RPPA Rwanda] Got ${rawTenders.length} tenders from ${url}`);
          break;
        }
      } catch (err) {
        console.log(`[RPPA Rwanda] Endpoint ${url} failed:`, (err as Error).message);
      }
    }

    // Fallback: Firecrawl the public tender page
    if (rawTenders.length === 0) {
      const { FirecrawlStrategy } = await import('../strategies/scraper-strategies');
      const fc = new FirecrawlStrategy();
      try {
        console.log(`[RPPA Rwanda] Trying Firecrawl on ${fallbackUrl}...`);
        const { result } = await fc.execute({ url: fallbackUrl, portalType: 'rppa_rw' });
        rawTenders = result ?? [];
        console.log(`[RPPA Rwanda] Firecrawl returned ${rawTenders.length} tenders.`);
      } catch (err) {
        console.log('[RPPA Rwanda] Firecrawl fallback failed:', (err as Error).message);
      }
    }

    if (rawTenders.length === 0) {
      console.log('[RPPA Rwanda] No data found. Skipping.');
      return 0;
    }

    const [rw] = await db
      .select({ id: countries.id })
      .from(countries)
      .where(eq(countries.code, 'RW'))
      .limit(1);

    if (!rw) {
      console.warn('[RPPA Rwanda] Rwanda country record not found.');
      return 0;
    }

    const formattedTenders = rawTenders
      .map((t: any) => {
        const title = t.title ?? t.subject ?? t.name ?? null;
        if (!title) return null;
        return {
          title,
          referenceNo: t.referenceNo ?? t.reference_no ?? t.id ?? `RW-TND-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          description: t.description ?? null,
          contractingAuthority: t.contractingAuthority ?? t.contracting_authority ?? t.entity ?? 'RPPA Rwanda',
          countryId: rw.id,
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

    console.log(`[RPPA Rwanda] Inserted ${inserted.length} new Rwanda tenders.`);
    return inserted.length;
  } catch (error) {
    console.error('[RPPA Rwanda] Fatal error:', error);
    return 0;
  }
}
