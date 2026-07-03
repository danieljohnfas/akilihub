import { db } from '../db/client';
import { tenders } from '../db/schema/tenders';
import { countries } from '../db/schema/shared';
import { eq } from 'drizzle-orm';

/**
 * Kenya Public Procurement & Asset Disposal Authority (PPRA)
 * Uses the official OCDS (Open Contracting Data Standard) JSON API
 * from tenders.go.ke — no scraping needed, official data feed.
 * Docs: https://tenders.go.ke/ocds
 */
export async function scrapePPRAKenya(): Promise<number> {
  // Official OCDS releases endpoint — returns the latest 50 contracting processes
  const apiUrl = 'https://tenders.go.ke/api/ocds/release-packages/?format=json&page_size=50';

  try {
    console.log(`[PPRA Kenya] Fetching from OCDS API: ${apiUrl}`);

    const res = await fetch(apiUrl, {
      headers: { Accept: 'application/json', 'User-Agent': 'AkiliBrain/1.0' },
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) throw new Error(`OCDS API returned ${res.status}`);

    const json = await res.json();
    // The API returns { results: [...releases] } or an OCDS release package array
    const releases: any[] = json?.results ?? json?.releases ?? (Array.isArray(json) ? json : []);

    if (releases.length === 0) {
      console.log('[PPRA Kenya] No releases returned from OCDS API.');
      return 0;
    }

    const [ke] = await db
      .select({ id: countries.id })
      .from(countries)
      .where(eq(countries.code, 'KE'))
      .limit(1);

    if (!ke) {
      console.warn('[PPRA Kenya] Kenya country record not found.');
      return 0;
    }

    const formattedTenders = releases
      .map((rel: any) => {
        const tender = rel?.tender ?? rel?.compiledRelease?.tender ?? {};
        const buyer = rel?.buyer ?? rel?.compiledRelease?.buyer ?? {};
        const planning = rel?.planning ?? rel?.compiledRelease?.planning ?? {};

        const title = tender.title ?? rel.title ?? null;
        if (!title) return null;

        const refNo = tender.id ?? rel.ocid ?? `KE-OCDS-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const deadline = tender.tenderPeriod?.endDate ? new Date(tender.tenderPeriod.endDate) : new Date(Date.now() + 86400000 * 30);
        const published = rel.date ? new Date(rel.date) : new Date();

        return {
          title,
          referenceNo: refNo,
          description: tender.description ?? null,
          contractingAuthority: buyer.name ?? 'Kenya Government',
          countryId: ke.id,
          publishedAt: published,
          deadline,
          sourceUrl: `https://tenders.go.ke/website/tenders/details/${rel.ocid ?? ''}`,
          status: 'open' as const,
          budget: tender.value?.amount ? String(tender.value.amount) : null,
          currency: tender.value?.currency ?? 'KES',
        };
      })
      .filter(Boolean) as any[];

    if (formattedTenders.length === 0) return 0;

    const inserted = await db
      .insert(tenders)
      .values(formattedTenders)
      .onConflictDoNothing({ target: tenders.referenceNo })
      .returning({ id: tenders.id });

    console.log(`[PPRA Kenya] Inserted ${inserted.length} new Kenya tenders.`);
    return inserted.length;
  } catch (error) {
    console.error('[PPRA Kenya] Failed to fetch from OCDS API:', error);
    return 0;
  }
}