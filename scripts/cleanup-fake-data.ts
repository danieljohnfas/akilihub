import { config } from 'dotenv';
config({ path: '.env.local' });

import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');

async function main() {
  console.log('🧹 Cleaning up fake/seeded data from the database...');

  // 1. Delete seeded salaries
  const salariesResult = await sql`DELETE FROM salary_submissions RETURNING id`;
  console.log(`✅ Deleted ${salariesResult.length} seeded salary submissions.`);

  // 2. Delete seeded guides
  const guidesResult = await sql`DELETE FROM guides RETURNING id`;
  console.log(`✅ Deleted ${guidesResult.length} AI-generated editorial guides.`);

  console.log('\nAll seeded data has been removed.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
