import { inngest } from "./client";
import { scrapeTRAResources } from "@/lib/scrapers/tra-tz-resources";
import { scrapeKRAResources } from "@/lib/scrapers/kra-ke-resources";
import { scrapeBRELAResources } from "@/lib/scrapers/brela-tz-resources";

function makeComplianceJob(
  id: string,
  name: string,
  cron: string,
  scraper: () => Promise<number>,
  source: string
) {
  return inngest.createFunction(
    { id, name, triggers: [{ cron }] },
    async ({ step }) => {
      const insertedCount = await step.run("execute-compliance-scraper", async () => {
        return await scraper();
      });

      return { message: `Scraped and inserted ${insertedCount} resources from ${source}.` };
    }
  );
}

// Weekly jobs on Sundays
export const scrapeTRAResourcesJob   = makeComplianceJob("scrape-tra-resources",   "🇹🇿 Scrape TRA Resources",   "0 3 * * 0", scrapeTRAResources,   "TRA Tanzania");
export const scrapeKRAResourcesJob   = makeComplianceJob("scrape-kra-resources",   "🇰🇪 Scrape KRA Resources",   "30 3 * * 0", scrapeKRAResources,   "KRA Kenya");
export const scrapeBRELAResourcesJob = makeComplianceJob("scrape-brela-resources", "🇹🇿 Scrape BRELA Resources", "0 4 * * 0", scrapeBRELAResources, "BRELA Tanzania");
