import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { jobs } from '../src/lib/db/schema/jobs';
import { countries, regions } from '../src/lib/db/schema/shared';
import { eq, desc, isNull, gt, or, and } from 'drizzle-orm';
import 'dotenv/config';

// Bypass DNS block
const dbUrl = process.env.DATABASE_URL.replace('db.pywienffahvmylssnorr.supabase.co', '13.250.231.118');
const sql = postgres(dbUrl);
const db = drizzle(sql);

async function main() {
  try {
    const activeCondition = and(
      eq(jobs.isActive, true),
      eq(jobs.isAggregatorSource, false),
      or(isNull(jobs.deadline), gt(jobs.deadline, new Date()))
    );

    console.log('Running Drizzle query exactly as in page.tsx...');
    const data = await db
      .select({
        job: jobs,
        country: countries.name,
        region: regions.name,
      })
      .from(jobs)
      .leftJoin(countries, eq(jobs.countryId, countries.id))
      .leftJoin(regions, eq(jobs.regionId, regions.id))
      .where(activeCondition)
      .orderBy(desc(jobs.createdAt))
      .limit(5);

    console.log('Results length:', data.length);
    console.log('First result:', data[0]);
  } catch(e) {
    console.error('QUERY ERROR:', e);
  } finally {
    await sql.end();
  }
}
main();
