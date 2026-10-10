import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL);

async function run() {
  const data = await sql`SELECT title, description FROM compliance_requirements WHERE renewal_period_days IS NULL LIMIT 2`;
  console.log(data);
  process.exit();
}
run();
