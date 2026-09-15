require('dotenv').config({path: '.env.remote'});
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);
async function main() {
  const res = await sql`SELECT * FROM jobs WHERE id = '1c0ae912-8a3e-41f0-b029-517f0a882b7f'`;
  console.dir(res, {depth: null});
  process.exit(0);
}
main();
