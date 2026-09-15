import { discoverJobs } from '../src/lib/scrapers/broad-search-engine';
import { saveJobs } from '../src/inngest/scrape-jobs';
import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { countries } from '../src/lib/db/schema/shared';
import { eq, sql } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const TARGET_JOBS = 2000;
const COUNTRY_CODE = 'TZ';

const cities = [
  'Dar es Salaam', 'Mwanza', 'Arusha', 'Dodoma', 'Mbeya',
  'Morogoro', 'Tanga', 'Kahama', 'Tabora', 'Zanzibar'
];

const titles = [
  'NGO jobs', 'UN jobs', 'software developer', 'accountant',
  'civil engineer', 'health medical', 'nurse', 'doctor',
  'teacher', 'lecturer', 'project manager', 'driver',
  'logistics', 'sales', 'marketing', 'human resources',
  'finance', 'banking', 'agriculture', 'technician',
  'plumber', 'electrician', 'welder', 'mechanic',
  'security', 'cleaner', 'cook', 'waiter', 'receptionist',
  'customer service', 'pharmacist', 'lab technician',
  'lawyer', 'legal counsel', 'data analyst', 'graphic designer',
  'journalist', 'social worker', 'driver', 'operations manager'
];

const extraModifiers = ['ajira mpya', 'nafasi za kazi', 'vacancies 2026', 'hiring now', 'jobs in'];

const queries: string[] = [];

// Generate combinations
for (const title of titles) {
  for (const city of cities) {
    queries.push(`${title} ${city} Tanzania 2026`);
    queries.push(`ajira mpya ${title} ${city}`);
    queries.push(`nafasi za kazi ${title} ${city} Tanzania`);
  }
}

// Shuffle queries
queries.sort(() => Math.random() - 0.5);

async function getJobCount() {
  const result = await db
    .select({ count: sql`count(*)`.mapWith(Number) })
    .from(jobs)
    .innerJoin(countries, eq(jobs.countryId, countries.id))
    .where(eq(countries.code, COUNTRY_CODE));
  return result[0].count;
}

async function run() {
  let count = await getJobCount();
  console.log(`Initial job count for ${COUNTRY_CODE}: ${count}`);
  
  for (const query of queries) {
    if (count >= TARGET_JOBS) {
      console.log(`Reached target of ${TARGET_JOBS} jobs for ${COUNTRY_CODE}. Stopping.`);
      break;
    }
    
    console.log(`\n--- Running query: "${query}" ---`);
    try {
      // discoverJobs uses google CSE / DDG and searches up to 5 pages.
      const discovered = await discoverJobs(query, 5);
      if (discovered.length > 0) {
        const inserted = await saveJobs(discovered, COUNTRY_CODE);
        console.log(`Inserted ${inserted} new jobs out of ${discovered.length} discovered.`);
      } else {
        console.log(`No jobs discovered for query.`);
      }
    } catch (e) {
      console.error(`Error during query "${query}":`, e);
    }
    
    count = await getJobCount();
    console.log(`Current job count for ${COUNTRY_CODE}: ${count}`);
  }
}

run().catch(console.error).finally(() => process.exit(0));
