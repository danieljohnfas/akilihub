import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { tenders } from '../src/lib/db/schema/tenders';
import { businesses } from '../src/lib/db/schema/compliance';
import { salarySubmissions } from '../src/lib/db/schema/salaries';
import { healthDataPoints } from '../src/lib/db/schema/health';
import { countries } from '../src/lib/db/schema/shared';
import { eq, sql } from 'drizzle-orm';

async function main() {
  console.log("--- JOBS ---");
  const jobsCount = await db.select({
    country: countries.name,
    count: sql<number>`count(*)`
  })
  .from(jobs)
  .innerJoin(countries, eq(jobs.countryId, countries.id))
  .groupBy(countries.name);
  console.log(jobsCount);

  console.log("--- TENDERS ---");
  const tendersCount = await db.select({
    country: countries.name,
    count: sql<number>`count(*)`
  })
  .from(tenders)
  .innerJoin(countries, eq(tenders.countryId, countries.id))
  .groupBy(countries.name);
  console.log(tendersCount);

  console.log("--- COMPLIANCE (BUSINESSES) ---");
  const complianceCount = await db.select({
    country: countries.name,
    count: sql<number>`count(*)`
  })
  .from(businesses)
  .innerJoin(countries, eq(businesses.countryId, countries.id))
  .groupBy(countries.name);
  console.log(complianceCount);

  console.log("--- SALARIES ---");
  const salariesCount = await db.select({
    country: countries.name,
    count: sql<number>`count(*)`
  })
  .from(salarySubmissions)
  .innerJoin(countries, eq(salarySubmissions.countryId, countries.id))
  .groupBy(countries.name);
  console.log(salariesCount);

  console.log("--- HEALTH FACILITIES ---");
  const healthCount = await db.select({
    country: countries.name,
    count: sql<number>`count(*)`
  })
  .from(healthDataPoints)
  .innerJoin(countries, eq(healthDataPoints.countryId, countries.id))
  .groupBy(countries.name);
  console.log(healthCount);

  process.exit(0);
}

main().catch(console.error);
