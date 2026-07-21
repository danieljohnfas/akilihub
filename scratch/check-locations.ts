import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { countries, regions } from '@/lib/db/schema/shared';
import { eq, isNull, gt, or, and } from 'drizzle-orm';

async function main() {
  const activeCondition = and(
    eq(jobs.isActive, true),
    or(isNull(jobs.deadline), gt(jobs.deadline, new Date()))
  );

  const uniqueLocationsData = await db.selectDistinct({ name: regions.name, country: countries.name })
      .from(jobs)
      .leftJoin(countries, eq(jobs.countryId, countries.id))
      .leftJoin(regions, eq(jobs.regionId, regions.id))
      .where(activeCondition);
      
  console.log("Unique Locations Data:", uniqueLocationsData);
  
  const jobsWithoutRegion = await db.select({ count: jobs.id }).from(jobs).where(isNull(jobs.regionId));
  console.log("Jobs without region:", jobsWithoutRegion.length);
  
  const jobsWithRegion = await db.select({ count: jobs.id }).from(jobs).where(gt(jobs.regionId, ''));
  console.log("Jobs with region:", jobsWithRegion.length);
  
  process.exit(0);
}

main().catch(console.error);
