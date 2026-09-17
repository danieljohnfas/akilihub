import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { jobs } from '../src/lib/db/schema/jobs';
import { tenders } from '../src/lib/db/schema/tenders';
import { salarySubmissions } from '../src/lib/db/schema/salaries';
import { businesses } from '../src/lib/db/schema/compliance';
import { gte, eq } from 'drizzle-orm';

const client = postgres(process.env.DATABASE_URL + '?sslmode=require', { max: 5 });
const db = drizzle(client);

async function run() {
  console.log('🧹 Purging all mock data generated today...');

  // Target everything created in the last 48 hours to safely remove our seed run
  const threshold = new Date(Date.now() - 48 * 60 * 60 * 1000);

  try {
    // 1. Delete Jobs
    const jobsDeleted = await db.delete(jobs)
      .where(gte(jobs.createdAt, threshold))
      .returning({ id: jobs.id });
    console.log(`✅ Deleted ${jobsDeleted.length} simulated jobs.`);

    // 2. Delete Tenders
    const tendersDeleted = await db.delete(tenders)
      .where(gte(tenders.createdAt, threshold))
      .returning({ id: tenders.id });
    console.log(`✅ Deleted ${tendersDeleted.length} simulated tenders.`);

    // 3. Delete Salaries
    // salarySubmissions uses submittedAt instead of createdAt
    const salariesDeleted = await db.delete(salarySubmissions)
      .where(gte(salarySubmissions.submittedAt, threshold))
      .returning({ id: salarySubmissions.id });
    console.log(`✅ Deleted ${salariesDeleted.length} simulated salaries.`);

    // 4. Delete Businesses
    const businessesDeleted = await db.delete(businesses)
      .where(gte(businesses.createdAt, threshold))
      .returning({ id: businesses.id });
    console.log(`✅ Deleted ${businessesDeleted.length} simulated businesses.`);

    console.log('🎉 All mock data successfully removed.');
  } catch (err) {
    console.error('Error during purge:', err);
  } finally {
    process.exit(0);
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
