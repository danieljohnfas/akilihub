import { StrategyEngine } from '../strategies/engine';
import {
  FirecrawlStrategy,
  MaxunStrategy,
  Crawl4AiStrategy,
  CrawleeStrategy,
} from '../strategies/scraper-strategies';
import { db } from '../db/client';
import { tenders } from '../db/schema/tenders';
import { countries } from '../db/schema/shared';
import { eq } from 'drizzle-orm';

/**
 * Kenya Public Procurement & Asset Disposal Authority (PPRA / tenders.go.ke)
 * Portal: https://tenders.go.ke/
 */
export async function scrapePPRAKenya(): Promise<number> {
  const targetUrl = 'https://tenders.go.ke/website/tenders/index';

  const scraperEngine = new StrategyEngine([
    new FirecrawlStrategy(),
    new MaxunStrategy(),
    new Crawl4AiStrategy(),
    new CrawleeStrategy(),
  ]);

  try {
    console.log(`Starting PPRA Kenya scrape for ${targetUrl}...`);

    const { result, strategyUsed } = await scraperEngine.executeWithFallback({
      url: targetUrl,
      portalType: 'ppoa_ke',
    });

    console.log(`Scraped ${result.length} tenders via ${strategyUsed}.`);
    if (result.length === 0) return 0;

    const [ke] = await db
      .select({ id: countries.id })
      .from(countries)
      .where(eq(countries.code, 'KE'))
      .limit(1);

    if (!ke) {
      console.warn('Kenya country record not found. Cannot insert tenders.');
      return 0;
    }

    const formattedTenders = result.map((t: any) => ({
      title: t.title,
      referenceNo: t.referenceNo || `KE-TND-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      description: t.description || null,
      contractingAuthority: t.contractingAuthority || 'PPRA Kenya',
      countryId: ke.id,
      publishedAt: new Date(t.publishedDate || Date.now()),
      deadline: new Date(t.deadline || Date.now() + 86400000 * 30),
      sourceUrl: t.sourceUrl || targetUrl,
      status: t.status || 'open',
    }));

    const inserted = await db
      .insert(tenders)
      .values(formattedTenders)
      .onConflictDoNothing({ target: tenders.referenceNo })
      .returning({ id: tenders.id });

    console.log(`Inserted ${inserted.length} new Kenya tenders.`);
    return inserted.length;
  } catch (error) {
    console.error('All scraper strategies failed for PPRA Kenya:', error);
    return 0;
  }
}