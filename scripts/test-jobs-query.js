require('dotenv').config({ path: '.env.local' });
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { jobs } = require('./src/lib/db/schema/jobs');
const { countries, regions } = require('./src/lib/db/schema/shared');
const { eq, desc, isNull, gt, or, and } = require('drizzle-orm');

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

    console.log('Running query...');
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
    if(data.length === 0) console.log('Empty data!');
  } catch(e) {
    console.error('QUERY ERROR:', e);
  } finally {
    await sql.end();
  }
}
main();
