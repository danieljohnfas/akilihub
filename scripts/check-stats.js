require('dotenv').config({ path: '.env.local' });
const postgres = require('postgres');

// Bypass DNS block
const dbUrl = process.env.DATABASE_URL.replace('db.pywienffahvmylssnorr.supabase.co', '13.250.231.118');
const sql = postgres(dbUrl);

async function main() {
  try {
    const active = await sql`SELECT count(*) FROM jobs WHERE is_active = true`;
    const nonAggregator = await sql`SELECT count(*) FROM jobs WHERE is_active = true AND is_aggregator_source = false`;
    const tenders = await sql`SELECT count(*) FROM tenders WHERE status = 'open'`;

    console.log('--- DIRECT DB QUERY RESULTS ---');
    console.log('Active Jobs (Total):', active[0].count);
    console.log('Active Jobs (Non-Aggregator):', nonAggregator[0].count);
    console.log('Open Tenders:', tenders[0].count);
  } catch(e) {
    console.error(e.message);
  } finally {
    await sql.end();
  }
}
main();
