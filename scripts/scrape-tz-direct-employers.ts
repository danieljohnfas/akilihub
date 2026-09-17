import { config } from 'dotenv';
config({ path: '.env.local' }); // Load env BEFORE other imports

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { jobs } from '../src/lib/db/schema/jobs';
import { countries } from '../src/lib/db/schema/shared';
import { eq, sql } from 'drizzle-orm';

const client = postgres(process.env.DATABASE_URL + '?sslmode=require', { max: 5 });
const db = drizzle(client);

const COUNTRY_CODE = 'TZ';

const employers = [
  'CRDB Bank Tanzania',
  'NMB Bank Tanzania',
  'Vodacom Tanzania',
  'Airtel Tanzania',
  'Tanzania Breweries Limited TBL',
  'TANESCO',
  'Tanzania Ports Authority TPA',
  'UNICEF Tanzania',
  'Standard Chartered Bank Tanzania',
  'World Vision Tanzania',
  'Aga Khan Hospital Dar es Salaam',
  'Tanzania Revenue Authority TRA'
];

const queries: string[] = [];

for (const employer of employers) {
  queries.push(`${employer} current vacancies 2026`);
  queries.push(`${employer} "apply now" OR "job description" Tanzania`);
}

async function getJobCount() {
  const result = await db
    .select({ count: sql`count(*)`.mapWith(Number) })
    .from(jobs)
    .innerJoin(countries, eq(jobs.countryId, countries.id))
    .where(eq(countries.code, COUNTRY_CODE));
  return result[0].count;
}

async function run() {
  // Dynamically import to ensure env vars are fully loaded before their module scopes evaluate
  const { discoverJobs } = await import('../src/lib/scrapers/broad-search-engine');
  const { saveJobs } = await import('../src/inngest/scrape-jobs');

  let count = await getJobCount();
  console.log(`Starting real direct employer scrape. Initial job count for ${COUNTRY_CODE}: ${count}`);
  
  for (const query of queries) {
    console.log(`\n--- Searching for real direct employer jobs: "${query}" ---`);
    try {
      const discovered = await discoverJobs(query, 2); 
      
      for (const job of discovered) {
          job.isAggregatorSource = false;
      }

      if (discovered.length > 0) {
        const inserted = await saveJobs(discovered, COUNTRY_CODE);
        console.log(`✅ Inserted ${inserted} real jobs out of ${discovered.length} discovered from direct portals.`);
      } else {
        console.log(`No active jobs discovered for query.`);
      }
    } catch (e) {
      console.error(`Error during query "${query}":`, e);
    }
  }
  
  count = await getJobCount();
  console.log(`\nFinished live scraping! Final job count for ${COUNTRY_CODE}: ${count}`);
}

run().catch(console.error).finally(() => process.exit(0));
