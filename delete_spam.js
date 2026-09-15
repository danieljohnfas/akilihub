require('dotenv').config({path: '.env.remote'});
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);
async function main() {
  const res = await sql`DELETE FROM jobs WHERE 
    source_url LIKE '%orbitdatasync%' OR 
    source_url LIKE '%.homes/%' OR 
    source_url LIKE '%.lol/%' OR 
    source_url LIKE '%.baby/%' OR 
    source_url LIKE '%profdir.com%' OR 
    source_url LIKE '%tanzapages.com%' OR
    source_url LIKE '%quantumfluxgrid%'`;
  console.log('Deleted spam jobs:', res.count);
  process.exit(0);
}
main();
