import { inngest } from "./client";
import { scrapePPRATZ } from "@/lib/scrapers/ppra-tz";
import { scrapePPRAKenya } from "@/lib/scrapers/ppoa-ke";
import { scrapePPDAUganda } from "@/lib/scrapers/ppda-ug";
import { scrapeRPPARwanda } from "@/lib/scrapers/rppa-rw";
import { scrapePPPAEthiopia } from "@/lib/scrapers/pppa-et";
import { scrapeARMPCongoDRC } from "@/lib/scrapers/armp-cd";

// Helper to create a standard scrape job and fire the alert event
function makeScrapeJob(
  id: string,
  name: string,
  cron: string,
  scraper: () => Promise<number>,
  source: string
) {
  return inngest.createFunction(
    { id, name, triggers: [{ cron }] },
    async ({ step }) => {
      const insertedCount = await step.run("execute-scraper", async () => {
        return await scraper();
      });

      if (insertedCount > 0) {
        await step.sendEvent("notify-new-tenders", {
          name: "tenders.new",
          data: { count: insertedCount, source },
        });
      }

      return { message: `Scraped and inserted ${insertedCount} tenders from ${source}.` };
    }
  );
}

// Daily jobs staggered by 30 min to avoid hammering the DB simultaneously
export const scrapePPRATanzaniaJob  = makeScrapeJob("scrape-ppra-tanzania",  "🇹🇿 Scrape PPRA Tanzania",  "0 0 * * *",  scrapePPRATZ,        "PPRA Tanzania");
export const scrapePPRAKenyaJob     = makeScrapeJob("scrape-ppra-kenya",     "🇰🇪 Scrape PPRA Kenya",     "30 0 * * *", scrapePPRAKenya,     "PPRA Kenya");
export const scrapePPDAUgandaJob    = makeScrapeJob("scrape-ppda-uganda",    "🇺🇬 Scrape PPDA Uganda",    "0 1 * * *",  scrapePPDAUganda,    "PPDA Uganda");
export const scrapeRPPARwandaJob    = makeScrapeJob("scrape-rppa-rwanda",    "🇷🇼 Scrape RPPA Rwanda",    "30 1 * * *", scrapeRPPARwanda,    "RPPA Rwanda");
export const scrapePPPAEthiopiaJob  = makeScrapeJob("scrape-pppa-ethiopia",  "🇪🇹 Scrape PPPA Ethiopia",  "0 2 * * *",  scrapePPPAEthiopia,  "PPPA Ethiopia");
export const scrapeARMPCongoDRCJob  = makeScrapeJob("scrape-armp-congo-drc", "🇨🇩 Scrape ARMP Congo DRC", "30 2 * * *", scrapeARMPCongoDRC, "ARMP Congo DRC");