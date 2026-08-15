import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { countries } from '../src/lib/db/schema/shared';
import { extractCountryCode } from '../src/lib/scrapers/deterministic-extractor';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('🔄 Starting historical country data cleanup...');

  // 1. Build a map of ISO alpha-2 codes to our internal country IDs
  const allCountries = await db.select().from(countries);
  const codeToId: Record<string, number> = {};
  for (const c of allCountries) {
    if (c.code) {
      codeToId[c.code] = c.id;
    }
  }

  // 2. Fetch all jobs
  const allJobs = await db.select({
    id: jobs.id,
    title: jobs.title,
    description: jobs.description,
    countryId: jobs.countryId,
    location: jobs.location
  }).from(jobs);

  console.log(`Found ${allJobs.length} jobs to process.`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  // 3. Process each job
  for (const job of allJobs) {
    const textToScan = `${job.location || ''} ${job.title} ${job.description}`;
    const isoCode = extractCountryCode(textToScan);

    if (isoCode && codeToId[isoCode]) {
      const newCountryId = codeToId[isoCode];
      
      // If it's different from the existing one, update it!
      if (newCountryId !== job.countryId) {
        await db.update(jobs)
          .set({ countryId: newCountryId, updatedAt: new Date() })
          .where(eq(jobs.id, job.id));
        updated++;
      } else {
        skipped++;
      }
    } else {
      notFound++;
    }
  }

  console.log('✅ Cleanup complete!');
  console.log(`- Updated: ${updated} jobs`);
  console.log(`- Skipped (already correct): ${skipped} jobs`);
  console.log(`- Not Found (fallback mapping): ${notFound} jobs`);

  process.exit(0);
}

main().catch(console.error);
