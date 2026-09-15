require('dotenv').config({path: '.env.remote'});
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);
async function main() {
  const res = await sql`DELETE FROM jobs WHERE deadline = posted_date + INTERVAL '30 days' OR deadline = created_at + INTERVAL '30 days'`;
  console.log('Deleted backfilled jobs:', res.count);
  process.exit(0);
}
main();
