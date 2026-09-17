import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { jobs } from '../src/lib/db/schema/jobs';
import { tenders } from '../src/lib/db/schema/tenders';
import { salarySubmissions } from '../src/lib/db/schema/salaries';
import { complianceRequirements } from '../src/lib/db/schema/compliance';
import { guides } from '../src/lib/db/schema/guides';
import { countries } from '../src/lib/db/schema/shared';
import { eq, like, and, gte } from 'drizzle-orm';

const client = postgres(process.env.DATABASE_URL + '?sslmode=require', { max: 5 });
const db = drizzle(client);

async function run() {
  console.log('Purging simulated TZ data...');

  const [{ id: countryId }] = await db
    .select({ id: countries.id })
    .from(countries)
    .where(eq(countries.code, 'TZ'))
    .limit(1);

  // We only delete records created very recently to avoid touching old real data
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Delete Simulated Jobs
  // Delete all TZ jobs created today (since there were only 3 real ones before)
  const jobsDeleted = await db.delete(jobs)
    .where(and(eq(jobs.countryId, countryId), gte(jobs.createdAt, today)))
    .returning({ id: jobs.id });
  console.log(`Deleted ${jobsDeleted.length} simulated jobs.`);

  // 2. Delete Simulated Tenders
  const tendersDeleted = await db.delete(tenders)
    .where(and(eq(tenders.countryId, countryId), gte(tenders.createdAt, today)))
    .returning({ id: tenders.id });
  console.log(`Deleted ${tendersDeleted.length} simulated tenders.`);

  // 3. Delete Simulated Salaries
  const salariesDeleted = await db.delete(salarySubmissions)
    .where(and(
        eq(salarySubmissions.countryId, countryId),
        gte(salarySubmissions.submittedAt, today),
        eq(salarySubmissions.isVerified, false)
    ))
    .returning({ id: salarySubmissions.id });
  console.log(`Deleted ${salariesDeleted.length} simulated salaries.`);

  // 4. Delete Simulated Compliance
  const complianceDeleted = await db.delete(complianceRequirements)
    .where(and(eq(complianceRequirements.countryId, countryId), gte(complianceRequirements.createdAt, today)))
    .returning({ id: complianceRequirements.id });
  console.log(`Deleted ${complianceDeleted.length} simulated compliance items.`);

  // 5. Delete Simulated Guides
  const guidesDeleted = await db.delete(guides)
    .where(like(guides.slug, '%-2026%'))
    .returning({ id: guides.id });
  console.log(`Deleted ${guidesDeleted.length} simulated guides.`);

  console.log('Purge complete.');
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
