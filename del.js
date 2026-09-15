require('dotenv').config({path: '.env.remote'});
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);
async function main() {
  const res = await sql`DELETE FROM jobs WHERE id = 'e8f922ad-151b-4341-a591-64fe4732f8bd'`;
  process.exit(0);
}
main();
