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
 * Ethiopia Public Procurement & Property Administration Agency (PPPA)
 * Portal: https://www.pppa.gov.et/
 */
export async function scrapePPPAEthiopia(): Promise<number> {
  const targetUrl = 'https://www.pppa.gov.et/index.php/bid-opportunities';

  const scraperEngine = new StrategyEngine([
    new FirecrawlStrategy(),
    new MaxunStrategy(),
    new Crawl4AiStrategy(),
    new CrawleeStrategy(),
  ]);

  try {
    console.log(`Starting PPPA Ethiopia scrape for ${targetUrl}...`);

    const { result, strategyUsed } = await scraperEngine.executeWithFallback({
      url: targetUrl,
      portalType: 'pppa_et',
    });

    console.log(`Scraped ${result.length} tenders via ${strategyUsed}.`);
    if (result.length === 0) return 0;

    const [et] = await db
      .select({ id: countries.id })
      .from(countries)
      .where(eq(countries.code, 'ET'))
      .limit(1);

    if (!et) {
      console.warn('Ethiopia country record not found. Cannot insert tenders.');
      return 0;
    }

    const formattedTenders = result.map((t: any) => ({
      title: t.title,
      referenceNo: t.referenceNo || `ET-TND-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      description: t.description || null,
      contractingAuthority: t.contractingAuthority || 'PPPA Ethiopia',
      countryId: et.id,
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

    console.log(`Inserted ${inserted.length} new Ethiopia tenders.`);
    return inserted.length;
  } catch (error) {
    console.error('All scraper strategies failed for PPPA Ethiopia:', error);
    return 0;
  }
}
