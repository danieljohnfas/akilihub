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
 * Congo DRC — Autorité de Régulation des Marchés Publics (ARMP)
 * Portal: https://www.armp.cd/
 */
export async function scrapeARMPCongoDRC(): Promise<number> {
  const targetUrl = 'https://www.armp.cd/index.php/appels-d-offres';

  const scraperEngine = new StrategyEngine([
    new FirecrawlStrategy(),
    new MaxunStrategy(),
    new Crawl4AiStrategy(),
    new CrawleeStrategy(),
  ]);

  try {
    console.log(`Starting ARMP Congo DRC scrape for ${targetUrl}...`);

    const { result, strategyUsed } = await scraperEngine.executeWithFallback({
      url: targetUrl,
      portalType: 'armp_cd',
    });

    console.log(`Scraped ${result.length} tenders via ${strategyUsed}.`);
    if (result.length === 0) return 0;

    const [cd] = await db
      .select({ id: countries.id })
      .from(countries)
      .where(eq(countries.code, 'CD'))
      .limit(1);

    if (!cd) {
      console.warn('Congo DRC country record not found. Cannot insert tenders.');
      return 0;
    }

    const formattedTenders = result.map((t: any) => ({
      title: t.title,
      referenceNo: t.referenceNo || `CD-TND-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      description: t.description || null,
      contractingAuthority: t.contractingAuthority || 'ARMP Congo DRC',
      countryId: cd.id,
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

    console.log(`Inserted ${inserted.length} new Congo DRC tenders.`);
    return inserted.length;
  } catch (error) {
    console.error('All scraper strategies failed for ARMP Congo DRC:', error);
    return 0;
  }
}
