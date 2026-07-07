import { inngest } from "./client";
import { discoverTenders, BroadTenderResource } from "@/lib/scrapers/broad-search-engine-tenders";
import { db } from "@/lib/db/client";
import { tenders } from "@/lib/db/schema/tenders";
import { countries } from "@/lib/db/schema/shared";
import { eq } from "drizzle-orm";

async function getCountryId(countryHint: string): Promise<string | null> {
  const result = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, countryHint)).limit(1);
  return result.length > 0 ? result[0].id : null;
}

async function saveTenders(discovered: BroadTenderResource[], countryCode: string): Promise<number> {
  const countryId = await getCountryId(countryCode);
  if (!countryId) return 0;

  let inserted = 0;
  for (const tender of discovered) {
    try {
      await db.insert(tenders).values({
        referenceNo: tender.referenceNo,
        title: tender.title,
        description: tender.description,
        contractingAuthority: tender.contractingAuthority,
        category: tender.category,
        budget: tender.budget?.toString() || null,
        currency: tender.currency,
        deadline: tender.deadline || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Default 14 days if missing
        sourceUrl: tender.sourceUrl,
        countryId,
        status: 'open',
      }).onConflictDoNothing();
      inserted++;
    } catch (e) {
      console.error(`Failed to insert tender: ${tender.referenceNo}`, e);
    }
  }
  return inserted;
}

function makeTenderJob(
  id: string,
  name: string,
  cron: string,
  query: string,
  countryCode: string
) {
  return inngest.createFunction(
    { id, name, triggers: [{ cron }] },
    async ({ step }) => {
      const insertedCount = await step.run("execute-scraper", async () => {
        const discovered = await discoverTenders(query, 5);
        return await saveTenders(discovered, countryCode);
      });

      if (insertedCount > 0) {
        await step.sendEvent("notify-new-tenders", {
          name: "tenders.new",
          data: { count: insertedCount, source: name },
        });
      }

      return { message: `Scraped and inserted ${insertedCount} tenders for ${name}.` };
    }
  );
}

// Daily jobs staggered by 30 min
export const scrapePPRATanzaniaJob  = makeTenderJob("scrape-tenders-tanzania",  "🇹🇿 Tenders Tanzania",  "0 0 * * *",  "government tenders Tanzania 2026", "TZ");
export const scrapePPRAKenyaJob     = makeTenderJob("scrape-tenders-kenya",     "🇰🇪 Tenders Kenya",     "30 0 * * *", "government tenders Kenya 2026", "KE");
export const scrapePPDAUgandaJob    = makeTenderJob("scrape-tenders-uganda",    "🇺🇬 Tenders Uganda",    "0 1 * * *",  "government tenders Uganda 2026", "UG");
export const scrapeRPPARwandaJob    = makeTenderJob("scrape-tenders-rwanda",    "🇷🇼 Tenders Rwanda",    "30 1 * * *", "government tenders Rwanda 2026", "RW");
export const scrapePPPAEthiopiaJob  = makeTenderJob("scrape-tenders-ethiopia",  "🇪🇹 Tenders Ethiopia",  "0 2 * * *",  "government tenders Ethiopia 2026", "ET");
export const scrapeARMPCongoDRCJob  = makeTenderJob("scrape-tenders-congo-drc", "🇨🇩 Tenders Congo DRC", "30 2 * * *", "government tenders Congo DRC 2026", "CD");