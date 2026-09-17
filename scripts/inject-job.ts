import 'dotenv/config';
import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { countries } from '../src/lib/db/schema/shared';
import { eq } from 'drizzle-orm';

async function main() {
  const countryRes = await db.select().from(countries).where(eq(countries.code, 'KE')).limit(1);
  const keId = countryRes[0].id;
  
  await db.insert(jobs).values({
    title: "Senior Software Engineer (Test Injection)",
    companyName: "TechCorp Kenya",
    description: "This is a test job inserted to verify database connectivity and frontend rendering.",
    countryId: keId,
    jobType: "full_time",
    sourceUrl: "https://example.com/job",
    isActive: true,
  }).onConflictDoNothing();

  console.log("Inserted job successfully.");
  process.exit(0);
}
main();
