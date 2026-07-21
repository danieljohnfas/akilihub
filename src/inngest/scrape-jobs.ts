import { inngest } from "./client";
import { discoverJobs, BroadJobResource } from "@/lib/scrapers/broad-search-engine";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema/jobs";
import { countries } from "@/lib/db/schema/shared";
import { eq } from "drizzle-orm";

async function getCountryId(countryHint: string): Promise<string | null> {
  const result = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, countryHint)).limit(1);
  return result.length > 0 ? result[0].id : null;
}

export async function saveJobs(discovered: BroadJobResource[], countryCode: string): Promise<number> {
  const countryId = await getCountryId(countryCode);
  if (!countryId) return 0;

  let inserted = 0;
  for (const job of discovered) {
    try {
      await db.insert(jobs).values({
        title: job.title,
        companyName: job.companyName,
        description: job.description,
        requirements: job.requirements,
        location: job.location,
        countryId,
        jobType: job.jobType,
        sourceUrl: job.sourceUrl,
        postedDate: new Date(),
        deadline: job.deadline,
        isActive: true,
      }).onConflictDoNothing();
      inserted++;
    } catch (e) {
      console.error(`Failed to insert job: ${job.title}`, e);
    }
  }
  return inserted;
}

function makeJobScraper(
  id: string,
  name: string,
  cron: string,
  query: string,
  countryCode: string
) {
  return inngest.createFunction(
    { id, name, triggers: [{ cron }] },
    async ({ step }) => {
      const insertedCount = await step.run("execute-job-scraper", async () => {
        const discovered = await discoverJobs(query, 3);
        return await saveJobs(discovered, countryCode);
      });

      return { message: `Scraped and inserted ${insertedCount} jobs for ${name}.` };
    }
  );
}

// Daily jobs staggered by 30 min (Starting at 04:30 to not overlap with compliance and tenders)
export const scrapeJobsKenyaJob    = makeJobScraper("scrape-jobs-kenya",    "🇰🇪 Jobs Kenya",    "30 4 * * *", "jobs hiring in Nairobi Kenya 2026", "KE");
export const scrapeJobsTanzaniaJob = makeJobScraper("scrape-jobs-tanzania", "🇹🇿 Jobs Tanzania", "0 5 * * *",  "jobs vacancies Tanzania Dar es Salaam 2026", "TZ");
export const scrapeJobsUgandaJob   = makeJobScraper("scrape-jobs-uganda",   "🇺🇬 Jobs Uganda",   "30 5 * * *", "jobs vacancies Uganda Kampala 2026", "UG");
export const scrapeJobsRwandaJob   = makeJobScraper("scrape-jobs-rwanda",   "🇷🇼 Jobs Rwanda",   "0 6 * * *",  "jobs vacancies Rwanda Kigali 2026", "RW");

export const scrapeJobsEthiopiaJob = makeJobScraper('scrape-jobs-ethiopia', '🇪🇹 Jobs Ethiopia', '30 6 * * *', 'jobs vacancies Ethiopia Addis Ababa 2026', 'ET');
export const scrapeJobsDRCJob = makeJobScraper('scrape-jobs-drc', '🇨🇩 Jobs DRC', '0 7 * * *', 'offres emploi RDC Kinshasa 2026', 'CD');
