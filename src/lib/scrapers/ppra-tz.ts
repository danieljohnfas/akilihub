import { StrategyEngine } from '../strategies/engine';
import { 
  MaxunStrategy, 
  Crawl4AiStrategy, 
  CrawleeStrategy
} from '../strategies/scraper-strategies';
import { db } from '../db/client';
import { tenders } from '../db/schema/tenders';
import { countries } from '../db/schema/shared';
import { eq } from 'drizzle-orm';

export async function scrapePPRATZ(): Promise<number> {
  const targetUrl = 'https://www.ppra.go.tz/tenders';
  
  // Initialize our fallback strategy chain: Maxun -> Crawl4AI -> Crawlee
  const scraperEngine = new StrategyEngine([
    new MaxunStrategy(),
    new Crawl4AiStrategy(),
    new CrawleeStrategy()
  ]);

  try {
    console.log(`Starting PPRA Tanzania scrape for ${targetUrl}...`);
    
    // Attempt to scrape
    const { result, strategyUsed } = await scraperEngine.executeWithFallback({
      url: targetUrl,
      portalType: 'ppra_tz'
    });
    
    console.log(`Successfully scraped ${result.length} tenders using ${strategyUsed}.`);
    
    if (result.length === 0) return 0;

    // Get Tanzania country ID
    const [tz] = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, 'TZ')).limit(1);
    if (!tz) {
      console.warn("Tanzania country record not found. Cannot insert tenders.");
      return 0;
    }

    // Map scraper results to DB schema
    // Assuming result array contains objects matching the required insert shape
    const formattedTenders = result.map((t: any) => ({
      title: t.title,
      referenceNo: t.referenceNo,
      description: t.description || null,
      contractingAuthority: t.contractingAuthority || 'PPRA Tanzania',
      countryId: tz.id,
      publishedAt: new Date(t.publishedDate || Date.now()),
      deadline: new Date(t.deadline || Date.now() + 86400000 * 30), // Default +30 days if missing
      sourceUrl: t.sourceUrl || targetUrl,
      status: t.status || 'open',
    }));

    // Bulk insert with onConflictDoNothing to avoid duplicates on referenceNo
    const inserted = await db.insert(tenders)
      .values(formattedTenders)
      .onConflictDoNothing({ target: tenders.referenceNo })
      .returning({ id: tenders.id });

    console.log(`Successfully inserted ${inserted.length} new tenders into database.`);

    return inserted.length;
  } catch (error) {
    console.error('All scraper strategies failed for PPRA TZ:', error);
    return 0;
  }
}