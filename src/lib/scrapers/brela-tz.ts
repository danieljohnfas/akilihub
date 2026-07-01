import { StrategyEngine } from '../strategies/engine';
import { 
  MaxunStrategy, 
  Crawl4AiStrategy, 
  CrawleeStrategy
} from '../strategies/scraper-strategies';
import { db } from '../db/client';
import { businesses } from '../db/schema/compliance';
import { countries } from '../db/schema/shared';
import { eq } from 'drizzle-orm';

export async function scrapeBrelaTZ(searchQuery: string = ''): Promise<number> {
  const targetUrl = `https://ors.brela.go.tz/orssims/searchinformation?query=${encodeURIComponent(searchQuery)}`;
  
  const scraperEngine = new StrategyEngine([
    new MaxunStrategy(),
    new Crawl4AiStrategy(),
    new CrawleeStrategy()
  ]);

  try {
    console.log(`Starting BRELA Tanzania scrape for ${targetUrl}...`);
    
    const { result, strategyUsed } = await scraperEngine.executeWithFallback({
      url: targetUrl,
      portalType: 'brela_tz'
    });
    
    console.log(`Successfully scraped ${result.length} businesses using ${strategyUsed}.`);
    
    if (result.length === 0) return 0;

    const [tz] = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, 'TZ')).limit(1);
    if (!tz) {
      console.warn("Tanzania country record not found. Cannot insert businesses.");
      return 0;
    }

    const formattedBusinesses = result.map((b: unknown) => ({
      name: b.name,
      registrationNumber: b.registrationNumber,
      countryId: tz.id,
      status: b.status || 'active',
      registrationDate: b.registrationDate ? new Date(b.registrationDate) : null,
      directors: b.directors || [],
      address: b.address || null,
    }));

    const inserted = await db.insert(businesses)
      .values(formattedBusinesses)
      .onConflictDoNothing({ target: businesses.registrationNumber })
      .returning({ id: businesses.id });

    console.log(`Successfully inserted ${inserted.length} new businesses into database.`);

    return inserted.length;
  } catch (error) {
    console.error('All scraper strategies failed for BRELA TZ:', error);
    return 0;
  }
}
