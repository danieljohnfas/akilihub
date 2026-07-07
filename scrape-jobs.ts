import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { countries } from '@/lib/db/schema/shared';
import { discoverJobs, BroadJobResource } from '@/lib/scrapers/broad-search-engine';
import { eq } from 'drizzle-orm';

// Country name -> UUID cache
const countryCache: Map<string, string> = new Map();

async function getCountryId(countryHint: string): Promise<string | null> {
  // Map common keywords to ISO codes
  const countryMap: Record<string, string> = {
    kenya: 'KE', nairobi: 'KE', ke: 'KE',
    tanzania: 'TZ', dar: 'TZ', tz: 'TZ',
    uganda: 'UG', kampala: 'UG', ug: 'UG',
    rwanda: 'RW', kigali: 'RW', rw: 'RW',
  };

  const lower = countryHint.toLowerCase();
  let code: string | undefined;

  for (const [keyword, iso] of Object.entries(countryMap)) {
    if (lower.includes(keyword)) {
      code = iso;
      break;
    }
  }

  if (!code) code = 'KE'; // Default to Kenya

  if (countryCache.has(code)) return countryCache.get(code)!;

  const result = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, code)).limit(1);
  if (result.length > 0) {
    countryCache.set(code, result[0].id);
    return result[0].id;
  }
  return null;
}

async function saveJobs(discovered: BroadJobResource[], countryHint: string): Promise<number> {
  let inserted = 0;
  const countryId = await getCountryId(countryHint);
  if (!countryId) {
    console.error(`[saveJobs] Could not resolve country for hint "${countryHint}"`);
    return 0;
  }

  for (const job of discovered) {
    try {
      const locationHint = job.location || countryHint;
      const resolvedCountryId = await getCountryId(locationHint) || countryId;

      await db.insert(jobs).values({
        title: job.title,
        companyName: job.companyName,
        description: job.description,
        requirements: job.requirements,
        location: job.location,
        countryId: resolvedCountryId,
        jobType: job.jobType,
        sourceUrl: job.sourceUrl,
        postedDate: new Date(),
        deadline: job.deadline,
        isActive: true,
      }).onConflictDoNothing();

      inserted++;
    } catch (err) {
      console.error(`[saveJobs] Failed to insert job "${job.title}":`, (err as Error).message);
    }
  }

  return inserted;
}

// Job search queries covering East Africa across different sectors
const SEARCH_QUERIES = [
  // Kenya
  { query: 'jobs hiring in Nairobi Kenya 2026', country: 'kenya' },
  { query: 'NGO jobs Kenya 2026', country: 'kenya' },
  { query: 'government jobs Kenya 2026 apply', country: 'kenya' },
  { query: 'tech jobs Nairobi 2026', country: 'kenya' },
  // Tanzania
  { query: 'jobs vacancies Tanzania Dar es Salaam 2026', country: 'tanzania' },
  { query: 'NGO jobs Tanzania 2026', country: 'tanzania' },
  { query: 'government jobs Tanzania 2026', country: 'tanzania' },
  // Uganda
  { query: 'jobs vacancies Uganda Kampala 2026', country: 'uganda' },
  { query: 'NGO jobs Uganda 2026', country: 'uganda' },
  // Rwanda
  { query: 'jobs vacancies Rwanda Kigali 2026', country: 'rwanda' },
];

async function main() {
  console.log('🚀 Starting broad job scraping...');
  let totalInserted = 0;

  for (const { query, country } of SEARCH_QUERIES) {
    console.log(`\n🔍 Query: "${query}"`);
    const discovered = await discoverJobs(query, 3);
    const inserted = await saveJobs(discovered, country);
    console.log(`✅ Inserted ${inserted} new jobs for query: "${query}"`);
    totalInserted += inserted;

    // Polite delay between queries
    await new Promise(res => setTimeout(res, 3000));
  }

  console.log(`\n🎉 Scraping complete! Total new jobs inserted: ${totalInserted}`);
  process.exit(0);
}

main().catch(console.error);
