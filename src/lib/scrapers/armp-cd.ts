import { db } from '../db/client';
import { tenders } from '../db/schema/tenders';
import { countries } from '../db/schema/shared';
import { eq } from 'drizzle-orm';

/**
 * Congo DRC — Autorité de Régulation des Marchés Publics (ARMP-RDC)
 * Correct portal: https://www.armp-rdc.cd (not armp.cd which is defunct)
 */
export async function scrapeARMPCongoDRC(): Promise<number> {
  const apiUrls = [
    'https://www.armp-rdc.cd/api/appels-offres?format=json',
    'https://www.armp-rdc.cd/appels-offres.json',
  ];
  const fallbackUrl = 'https://www.armp-rdc.cd/appels-offres';

  try {
    let rawTenders: any[] = [];

    // Try JSON API endpoints first
    for (const url of apiUrls) {
      try {
        console.log(`[ARMP DRC] Trying API endpoint: ${url}`);
        const res = await fetch(url, {
          headers: { Accept: 'application/json', 'User-Agent': 'AkiliBrain/1.0' },
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) continue;
        const contentType = res.headers.get('content-type') ?? '';
        if (!contentType.includes('json')) continue;
        const data = await res.json();
        rawTenders = Array.isArray(data) ? data : data?.results ?? data?.appels ?? data?.data ?? [];
        if (rawTenders.length > 0) {
          console.log(`[ARMP DRC] Got ${rawTenders.length} tenders from ${url}`);
          break;
        }
      } catch (err) {
        console.log(`[ARMP DRC] Endpoint ${url} failed:`, (err as Error).message);
      }
    }

    // Fallback: try Firecrawl on the correct web portal
    if (rawTenders.length === 0) {
      const { FirecrawlStrategy } = await import('../strategies/scraper-strategies');
      const fc = new FirecrawlStrategy();
      try {
        console.log(`[ARMP DRC] Trying Firecrawl on ${fallbackUrl}...`);
        const result = await fc.execute({ url: fallbackUrl, portalType: 'armp_cd' });
        rawTenders = result ?? [];
        console.log(`[ARMP DRC] Firecrawl extracted ${rawTenders.length} potential tenders.`);
      } catch (err) {
        console.log('[ARMP DRC] Firecrawl fallback also failed:', (err as Error).message);
      }
    }

    if (rawTenders.length === 0) {
      console.log('[ARMP DRC] No data found. Skipping.');
      return 0;
    }

    const [cd] = await db
      .select({ id: countries.id })
      .from(countries)
      .where(eq(countries.code, 'CD'))
      .limit(1);

    if (!cd) {
      console.warn('[ARMP DRC] Congo DRC country record not found.');
      return 0;
    }

    const formattedTenders = rawTenders
      .map((t: any) => {
        const title = t.title ?? t.objet ?? t.intitule ?? null;
        if (!title) return null;
        return {
          title,
          referenceNo: t.referenceNo ?? t.reference ?? t.id ?? `CD-TND-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          description: t.description ?? null,
          contractingAuthority: t.contractingAuthority ?? t.autorite ?? t.entite ?? 'ARMP Congo DRC',
          countryId: cd.id,
          publishedAt: new Date(t.publishedAt ?? t.date_publication ?? Date.now()),
          deadline: new Date(t.deadline ?? t.date_limite ?? Date.now() + 86400000 * 30),
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

    console.log(`[ARMP DRC] Inserted ${inserted.length} new Congo DRC tenders.`);
    return inserted.length;
  } catch (error) {
    console.error('[ARMP DRC] Fatal error:', error);
    return 0;
  }
}
