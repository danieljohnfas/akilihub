import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');
async function main() {
  const s = await sql`DELETE FROM salary_submissions WHERE submitted_at > NOW() - INTERVAL '8 hours'`;
  console.log('Deleted salaries:', s.count);
  process.exit(0);
}
main().catch(console.error);
