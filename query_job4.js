require('dotenv').config({path: '.env.remote'});
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);
async function main() {
  const res = await sql`SELECT * FROM jobs WHERE id = 'b2b70a48-30b5-4f2f-97d0-e0f11e072da8'`;
  console.dir(res, {depth: null});
  process.exit(0);
}
main();
