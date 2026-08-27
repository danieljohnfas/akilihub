require('dotenv').config({ path: '.env.local' });
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL.replace('db.pywienffahvmylssnorr.supabase.co', '13.250.231.118'));
async function main() {
  try {
    const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'tenders'`;
    console.log('TENDERS:', cols.map(c => c.column_name).join(', '));
    const jobsCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'jobs'`;
    console.log('JOBS:', jobsCols.map(c => c.column_name).join(', '));
  } finally {
    await sql.end();
  }
}
main();
