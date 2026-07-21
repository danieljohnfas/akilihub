import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { tenders } from '../src/lib/db/schema/tenders';
import { salarySubmissions } from '../src/lib/db/schema/salaries';
import { countries } from '../src/lib/db/schema/shared';
import { sql, desc, eq, max } from 'drizzle-orm';

async function main() {
  console.log('--- Last Scraped Dates ---');
  
  const lastJob = await db.select({ date: max(jobs.createdAt) }).from(jobs);
  const lastTender = await db.select({ date: max(tenders.createdAt) }).from(tenders);
  const lastSalary = await db.select({ date: max(salarySubmissions.submittedAt) }).from(salarySubmissions);

  console.log(`Last Job added: ${lastJob[0]?.date}`);
  console.log(`Last Tender added: ${lastTender[0]?.date}`);
  console.log(`Last Salary submission: ${lastSalary[0]?.date}`);
  console.log('\n--- Counts by Area and Country ---');

  // Jobs by Country
  const jobsCount = await db.select({
    country: countries.name,
    count: sql<number>`count(*)`
  })
  .from(jobs)
  .leftJoin(countries, eq(jobs.countryId, countries.id))
  .groupBy(countries.name)
  .orderBy(desc(sql`count(*)`));
  
  console.log('Jobs:');
  jobsCount.forEach(r => console.log(`  ${r.country || 'Unknown'}: ${r.count}`));

  // Tenders by Country
  const tendersCount = await db.select({
    country: countries.name,
    count: sql<number>`count(*)`
  })
  .from(tenders)
  .leftJoin(countries, eq(tenders.countryId, countries.id))
  .groupBy(countries.name)
  .orderBy(desc(sql`count(*)`));
  
  console.log('\nTenders:');
  tendersCount.forEach(r => console.log(`  ${r.country || 'Unknown'}: ${r.count}`));

  // Salaries by Country
  const salariesCount = await db.select({
    country: countries.name,
    count: sql<number>`count(*)`
  })
  .from(salarySubmissions)
  .leftJoin(countries, eq(salarySubmissions.countryId, countries.id))
  .groupBy(countries.name)
  .orderBy(desc(sql`count(*)`));
  
  console.log('\nSalaries:');
  salariesCount.forEach(r => console.log(`  ${r.country || 'Unknown'}: ${r.count}`));

  process.exit(0);
}

main().catch(console.error);
