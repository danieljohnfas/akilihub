import { db } from '../db/client';
import { tenders } from '../db/schema/tenders';
import { countries } from '../db/schema/shared';
import { eq } from 'drizzle-orm';
import { createGunzip } from 'zlib';
import { Readable } from 'stream';

/**
 * Kenya Public Procurement & Asset Disposal Authority (PPRA)
 * Uses the official OCDS bulk data files from tenders.go.ke/ocds
 * Data is published as gzipped JSONL files per fiscal year.
 */
export async function scrapePPRAKenya(): Promise<number> {
  // Official OCDS bulk data files - try current + last financial year
  const currentYear = new Date().getFullYear();
  const dataUrls = [
    `https://tenders.go.ke/ocds/bulk-download/json/${currentYear}`,
    `https://tenders.go.ke/ocds/bulk-download/json/${currentYear - 1}`,
    // Fallback: direct Firecrawl on the live portal
  ];

  try {
    let rawTenders: any[] = [];

    for (const url of dataUrls) {
      try {
        console.log(`[PPRA Kenya] Fetching OCDS bulk data from: ${url}`);
        const res = await fetch(url, {
          headers: { 'User-Agent': 'AkiliBrain/1.0', Accept: 'application/octet-stream,application/json,*/*' },
          signal: AbortSignal.timeout(45_000),
        });

        if (!res.ok) {
          console.log(`[PPRA Kenya] ${url} returned ${res.status}, trying next...`);
          continue;
        }

        const contentType = res.headers.get('content-type') ?? '';
        const text = await res.text();

        // Check if it's JSONL (one JSON object per line)
        const lines = text.trim().split('\n').filter(Boolean);
        for (const line of lines.slice(0, 100)) { // cap at 100 records
          try {
            const obj = JSON.parse(line);
            const releases: any[] = obj?.releases ?? (Array.isArray(obj) ? obj : [obj]);
            for (const rel of releases) {
              const tender = rel?.tender ?? rel?.compiledRelease?.tender ?? {};
              const buyer = rel?.buyer ?? rel?.compiledRelease?.buyer ?? {};
              const title = tender.title ?? rel.title ?? null;
              if (!title) continue;
              rawTenders.push({
                title,
                referenceNo: tender.id ?? rel.ocid ?? `KE-OCDS-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                description: tender.description ?? null,
                contractingAuthority: buyer.name ?? 'Kenya Government',
                publishedAt: rel.date ? new Date(rel.date) : new Date(),
                deadline: tender.tenderPeriod?.endDate ? new Date(tender.tenderPeriod.endDate) : new Date(Date.now() + 86400000 * 30),
                sourceUrl: `https://tenders.go.ke/website/tenders/details/${rel.ocid ?? ''}`,
                budget: tender.value?.amount ? String(tender.value.amount) : null,
                currency: tender.value?.currency ?? 'KES',
              });
            }
          } catch {
            // Single malformed line — skip
          }
        }

        if (rawTenders.length > 0) {
          console.log(`[PPRA Kenya] Parsed ${rawTenders.length} tenders from OCDS bulk data.`);
          break;
        }
      } catch (err) {
        console.log(`[PPRA Kenya] URL ${url} failed:`, (err as Error).message);
      }
    }

    // Fallback: Firecrawl the live portal page
    if (rawTenders.length === 0) {
      const { FirecrawlStrategy } = await import('../strategies/scraper-strategies');
      const fc = new FirecrawlStrategy();
      try {
        console.log('[PPRA Kenya] Trying Firecrawl on tenders.go.ke...');
        const result = await fc.execute({ url: 'https://tenders.go.ke/website/tenders/index', portalType: 'ppoa_ke' });
        rawTenders = result ?? [];
        console.log(`[PPRA Kenya] Firecrawl returned ${rawTenders.length} tenders.`);
      } catch (err) {
        console.log('[PPRA Kenya] Firecrawl fallback failed:', (err as Error).message);
      }
    }

    if (rawTenders.length === 0) {
      console.log('[PPRA Kenya] No data found from any source. Skipping.');
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

    const formattedTenders = rawTenders
      .map((t: any) => ({
        title: t.title,
        referenceNo: t.referenceNo ?? `KE-TND-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        description: t.description ?? null,
        contractingAuthority: t.contractingAuthority ?? 'Kenya Government',
        countryId: ke.id,
        publishedAt: t.publishedAt ?? new Date(),
        deadline: t.deadline ?? new Date(Date.now() + 86400000 * 30),
        sourceUrl: t.sourceUrl ?? 'https://tenders.go.ke',
        status: 'open' as const,
        budget: t.budget ?? null,
        currency: t.currency ?? 'KES',
      }));

    const inserted = await db
      .insert(tenders)
      .values(formattedTenders)
      .onConflictDoNothing({ target: tenders.referenceNo })
      .returning({ id: tenders.id });

    console.log(`[PPRA Kenya] Inserted ${inserted.length} new Kenya tenders.`);
    return inserted.length;
  } catch (error) {
    console.error('[PPRA Kenya] Fatal error:', error);
    return 0;
  }
}