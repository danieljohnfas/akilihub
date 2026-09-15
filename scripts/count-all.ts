import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');
async function main() {
  const jobs = await sql`SELECT COUNT(*) FROM jobs`;
  const tenders = await sql`SELECT COUNT(*) FROM tenders`;
  const compliance = await sql`SELECT COUNT(*) FROM businesses`;
  const health = await sql`SELECT COUNT(*) FROM health_indicators`;
  const salaries = await sql`SELECT COUNT(*) FROM salary_submissions`;
  console.log({
    jobs: jobs[0].count,
    tenders: tenders[0].count,
    compliance: compliance[0].count,
    health: health[0].count,
    salaries: salaries[0].count
  });
  process.exit(0);
}
main().catch(console.error);
