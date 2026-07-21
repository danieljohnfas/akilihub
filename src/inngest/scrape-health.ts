import { inngest } from "./client";
import { discoverHealth, BroadHealthResource } from "@/lib/scrapers/broad-search-engine-health";
import { db } from "@/lib/db/client";
import { healthIndicators, healthDataPoints } from "@/lib/db/schema/health";
import { countries } from "@/lib/db/schema/shared";
import { eq } from "drizzle-orm";

export async function saveHealthDb(discovered: BroadHealthResource[], countryCode: string): Promise<number> {
  const result = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, countryCode)).limit(1);
  const countryId = result.length > 0 ? result[0].id : null;
  if (!countryId) return 0;

  let insertedCount = 0;
  for (const h of discovered) {
    try {
      // 1. Resolve Indicator
      let indId: string | null = null;
      const indRes = await db.select({ id: healthIndicators.id }).from(healthIndicators).where(eq(healthIndicators.code, h.indicatorCode)).limit(1);
      if (indRes.length > 0) {
        indId = indRes[0].id;
      } else {
        const newInd = await db.insert(healthIndicators).values({
          code: h.indicatorCode,
          name: h.indicatorName,
          unit: h.unit,
          category: h.category,
        }).onConflictDoNothing().returning({ id: healthIndicators.id });
        
        if (newInd.length > 0) indId = newInd[0].id;
        else {
          const indResRetry = await db.select({ id: healthIndicators.id }).from(healthIndicators).where(eq(healthIndicators.code, h.indicatorCode)).limit(1);
          if (indResRetry.length > 0) indId = indResRetry[0].id;
        }
      }

      if (!indId) continue;

      await db.insert(healthDataPoints).values({
        indicatorId: indId,
        countryId,
        value: h.value.toString(),
        year: h.year,
        source: 'AI Broad Search',
      });
      insertedCount++;
    } catch (e) {
      console.error(`Failed to insert health point: ${h.indicatorName}`, e);
    }
  }
  return insertedCount;
}



function makeHealthScraper(id: string, name: string, cron: string, query: string, countryCode: string) {
  return inngest.createFunction(
    { id, name, triggers: [{ cron }] },
    async ({ step }) => {
      const insertedCount = await step.run("execute-health-scraper", async () => {
        const discovered = await discoverHealth(query, 1);
        return await saveHealthDb(discovered, countryCode);
      });
      return { message: `Scraped and inserted ${insertedCount} health data points for ${name}.` };
    }
  );
}

export const scrapeHealthKenyaJob = makeHealthScraper('scrape-health-kenya', '🇰🇪 Health Kenya', '0 8 * * *', 'public health statistics maternal mortality DHIS2 Kenya', 'KE');
export const scrapeHealthTanzaniaJob = makeHealthScraper('scrape-health-tanzania', '🇹🇿 Health Tanzania', '15 8 * * *', 'public health statistics maternal mortality DHIS2 Tanzania', 'TZ');
export const scrapeHealthUgandaJob = makeHealthScraper('scrape-health-uganda', '🇺🇬 Health Uganda', '30 8 * * *', 'public health statistics maternal mortality DHIS2 Uganda', 'UG');
export const scrapeHealthRwandaJob = makeHealthScraper('scrape-health-rwanda', '🇷🇼 Health Rwanda', '45 8 * * *', 'public health statistics maternal mortality DHIS2 Rwanda', 'RW');
export const scrapeHealthEthiopiaJob = makeHealthScraper('scrape-health-ethiopia', '🇪🇹 Health Ethiopia', '0 9 * * *', 'public health statistics maternal mortality DHIS2 Ethiopia', 'ET');
export const scrapeHealthDRCJob = makeHealthScraper('scrape-health-drc', '🇨🇩 Health DRC', '15 9 * * *', 'statistiques sante publique mortalite maternelle RDC Congo', 'CD');
