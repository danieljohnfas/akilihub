require('dotenv').config({path: '.env.remote'});
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);
async function main() {
  const res = await sql`SELECT id, title, source_url FROM jobs ORDER BY created_at DESC`;
  console.dir(res, {depth: null});
  process.exit(0);
}
main();
