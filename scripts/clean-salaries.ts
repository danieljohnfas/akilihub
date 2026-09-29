// SAFETY: this script deletes data. It refuses to run unless invoked with --apply,
// so a stray `tsx scripts/<name>` can never wipe rows. Read the SQL below first, and take a backup.
if (!process.argv.includes('--apply')) {
  console.error('Refusing to run: this script deletes data. Re-run with --apply after reviewing it.');
  process.exit(1);
}

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
