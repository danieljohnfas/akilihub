require('dotenv').config({path: '.env.remote'});
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);
async function main() {
  const res = await sql`SELECT count(*) FROM jobs`;
  console.log('Total Jobs count:', res[0].count);
  process.exit(0);
}
main();
