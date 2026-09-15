import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

async function main() {
  const jobId = '9f4c013b-8aed-4d2f-858c-decfa3b76d7c';

  console.log(`Fixing job ${jobId}...`);

  await db.update(jobs).set({
    sector: 'Health Care',
    profession: 'Professionals',
    educationLevel: "Bachelor's or Equivalent Level",
    experienceLevel: 'mid', // Description says 4 years experience, overriding aggregator's "Entry level"
    salaryCurrency: 'USD',
    // Salary is kept as-is ($58k-$90k); it's per year per schema convention
  }).where(eq(jobs.id, jobId));

  console.log('✅ Fixed job data:');
  const [updated] = await db.execute(sql`
    SELECT id, title, sector, profession, education_level, experience_level, salary_min, salary_max, salary_currency
    FROM jobs WHERE id = ${jobId}
  `);
  console.log(updated);
  process.exit(0);
}

main().catch(console.error);
