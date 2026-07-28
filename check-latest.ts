import { db } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { tenders } from '@/lib/db/schema/tenders';
import { healthDataPoints } from '@/lib/db/schema/health';
import { complianceRequirements } from '@/lib/db/schema/compliance';
import { salarySubmissions } from '@/lib/db/schema/salaries';
import { desc } from 'drizzle-orm';

async function main() {
  try {
    const latestJob = await db.select({ createdAt: jobs.createdAt }).from(jobs).orderBy(desc(jobs.createdAt)).limit(1);
    const latestTender = await db.select({ createdAt: tenders.createdAt }).from(tenders).orderBy(desc(tenders.createdAt)).limit(1);
    const latestHealth = await db.select({ createdAt: healthDataPoints.createdAt }).from(healthDataPoints).orderBy(desc(healthDataPoints.createdAt)).limit(1);
    const latestCompliance = await db.select({ createdAt: complianceRequirements.createdAt }).from(complianceRequirements).orderBy(desc(complianceRequirements.createdAt)).limit(1);
    const latestSalary = await db.select({ createdAt: salarySubmissions.createdAt }).from(salarySubmissions).orderBy(desc(salarySubmissions.createdAt)).limit(1);

    console.log('Latest Job:', latestJob[0]?.createdAt || 'None');
    console.log('Latest Tender:', latestTender[0]?.createdAt || 'None');
    console.log('Latest Health Data:', latestHealth[0]?.createdAt || 'None');
    console.log('Latest Compliance:', latestCompliance[0]?.createdAt || 'None');
    console.log('Latest Salary:', latestSalary[0]?.createdAt || 'None');
  } catch (err) {
    console.error('Error fetching data:', err);
  } finally {
    process.exit(0);
  }
}

main();
