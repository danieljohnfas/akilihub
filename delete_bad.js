require('dotenv').config({path: '.env.remote'});
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);
async function main() {
  const res = await sql`DELETE FROM jobs WHERE source_url LIKE '%tanzapages.com%'`;
  console.log('Deleted tanzapages jobs:', res.count);
  
  // also let's delete jobs that have no apply URL and have a very short description
  const res2 = await sql`DELETE FROM jobs WHERE length(description) < 50 AND (employer_url IS NULL OR employer_url = source_url)`;
  console.log('Deleted fake generic jobs:', res2.count);
  process.exit(0);
}
main();
