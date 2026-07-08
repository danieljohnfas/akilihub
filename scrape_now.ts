import { discoverJobs, BroadJobResource } from "./src/lib/scrapers/broad-search-engine";
import { db } from "./src/lib/db/client";
import { jobs } from "./src/lib/db/schema/jobs";
import { countries } from "./src/lib/db/schema/shared";
import { eq } from "drizzle-orm";

async function getCountryId(countryHint: string): Promise<string | null> {
  const result = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, countryHint)).limit(1);
  return result.length > 0 ? result[0].id : null;
}

async function saveJobs(discovered: BroadJobResource[], countryCode: string): Promise<number> {
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

async function run() {
  console.log('🚀 Triggering manual job scraper...');
  
  // Custom query for more health/tech specific roles in East Africa
  const query = "healthcare tech IT jobs Nairobi Dar es Salaam Kampala 2026";
  const discovered = await discoverJobs(query, 3);
  
  const tzInserted = await saveJobs(discovered, "TZ"); // Just map to TZ for now or split
  console.log(`✅ Finished manual scrape. Inserted ${tzInserted} new jobs.`);
  process.exit(0);
}

run().catch(console.error);
