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
 * Rwanda Public Procurement Authority (RPPA)
 * Portal: https://www.rppa.gov.rw/
 */
export async function scrapeRPPARwanda(): Promise<number> {
  const targetUrl = 'https://www.rppa.gov.rw/index.php?id=tender';

  const scraperEngine = new StrategyEngine([
    new FirecrawlStrategy(),
    new MaxunStrategy(),
    new Crawl4AiStrategy(),
    new CrawleeStrategy(),
  ]);

  try {
    console.log(`Starting RPPA Rwanda scrape for ${targetUrl}...`);

    const { result, strategyUsed } = await scraperEngine.executeWithFallback({
      url: targetUrl,
      portalType: 'rppa_rw',
    });

    console.log(`Scraped ${result.length} tenders via ${strategyUsed}.`);
    if (result.length === 0) return 0;

    const [rw] = await db
      .select({ id: countries.id })
      .from(countries)
      .where(eq(countries.code, 'RW'))
      .limit(1);

    if (!rw) {
      console.warn('Rwanda country record not found. Cannot insert tenders.');
      return 0;
    }

    const formattedTenders = result.map((t: any) => ({
      title: t.title,
      referenceNo: t.referenceNo || `RW-TND-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      description: t.description || null,
      contractingAuthority: t.contractingAuthority || 'RPPA Rwanda',
      countryId: rw.id,
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

    console.log(`Inserted ${inserted.length} new Rwanda tenders.`);
    return inserted.length;
  } catch (error) {
    console.error('All scraper strategies failed for RPPA Rwanda:', error);
    return 0;
  }
}
