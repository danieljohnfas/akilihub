require('dotenv').config({path: '.env.remote'});
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);
async function main() {
  const res = await sql`UPDATE jobs SET deadline = posted_date + INTERVAL '30 days' WHERE deadline IS NULL AND posted_date IS NOT NULL`;
  const res2 = await sql`UPDATE jobs SET deadline = created_at + INTERVAL '30 days' WHERE deadline IS NULL AND posted_date IS NULL`;
  console.log('Updated deadlines:', res.count + res2.count);
  process.exit(0);
}
main();
