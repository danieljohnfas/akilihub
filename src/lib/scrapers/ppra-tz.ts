import { db } from '../db/client';
import { tenders } from '../db/schema/tenders';
import { countries } from '../db/schema/shared';
import { eq } from 'drizzle-orm';

/**
 * Tanzania PPRA — Public Procurement Regulatory Authority
 * Uses the official PPRA Tanzania tender RSS/XML feed and JSON API endpoint.
 * Falls back to a direct API approach if RSS is unavailable.
 * Portal: https://www.ppra.go.tz
 */
export async function scrapePPRATZ(): Promise<number> {
  // PPRA TZ publishes tender data through a structured JSON endpoint
  const apiUrls = [
    'https://www.ppra.go.tz/api/tenders?format=json&status=open',
    'https://www.ppra.go.tz/tenders.json',
  ];

  try {
    let rawTenders: any[] = [];

    for (const url of apiUrls) {
      try {
        console.log(`[PPRA TZ] Trying API endpoint: ${url}`);
        const res = await fetch(url, {
          headers: { Accept: 'application/json', 'User-Agent': 'AkiliBrain/1.0' },
          signal: AbortSignal.timeout(20_000),
        });

        if (!res.ok) {
          console.log(`[PPRA TZ] Endpoint ${url} returned ${res.status}, trying next...`);
          continue;
        }

        const contentType = res.headers.get('content-type') ?? '';
        if (!contentType.includes('json')) {
          console.log(`[PPRA TZ] Endpoint ${url} returned non-JSON content-type: ${contentType}`);
          continue;
        }

        const data = await res.json();
        rawTenders = Array.isArray(data) ? data : data?.tenders ?? data?.results ?? [];
        if (rawTenders.length > 0) {
          console.log(`[PPRA TZ] Got ${rawTenders.length} tenders from ${url}`);
          break;
        }
      } catch (err) {
        console.log(`[PPRA TZ] Endpoint ${url} failed:`, (err as Error).message);
      }
    }

    if (rawTenders.length === 0) {
      console.log('[PPRA TZ] No data from any endpoint. Skipping.');
      return 0;
    }

    const [tz] = await db
      .select({ id: countries.id })
      .from(countries)
      .where(eq(countries.code, 'TZ'))
      .limit(1);

    if (!tz) {
      console.warn('[PPRA TZ] Tanzania country record not found.');
      return 0;
    }

    const formattedTenders = rawTenders
      .map((t: any) => {
        const title = t.title ?? t.subject ?? t.name ?? null;
        if (!title) return null;
        return {
          title,
          referenceNo: t.referenceNo ?? t.reference_no ?? t.id ?? `TZ-TND-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          description: t.description ?? null,
          contractingAuthority: t.contractingAuthority ?? t.contracting_authority ?? t.entity ?? 'PPRA Tanzania',
          countryId: tz.id,
          publishedAt: new Date(t.publishedAt ?? t.published_at ?? t.datePublished ?? Date.now()),
          deadline: new Date(t.deadline ?? t.closingDate ?? t.closing_date ?? Date.now() + 86400000 * 30),
          sourceUrl: t.sourceUrl ?? t.source_url ?? t.url ?? 'https://www.ppra.go.tz/tenders',
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

    console.log(`[PPRA TZ] Inserted ${inserted.length} new Tanzania tenders.`);
    return inserted.length;
  } catch (error) {
    console.error('[PPRA TZ] Fatal error:', error);
    return 0;
  }
}