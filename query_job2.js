require('dotenv').config({path: '.env.remote'});
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);
async function main() {
  const res = await sql`SELECT deadline, source_url FROM jobs WHERE id = '2a1cb5d8-9579-47e2-bf69-8c4aec5e44c0'`;
  console.log(res);
  process.exit(0);
}
main();
