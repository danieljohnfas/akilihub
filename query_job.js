require('dotenv').config({path: '.env.remote'});
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);
async function main() {
  const res = await sql`SELECT * FROM jobs WHERE id = 'd1e9ec3d-8e44-459e-a04f-42c3c078721c'`;
  console.log(res);
  process.exit(0);
}
main();
