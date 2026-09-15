import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
async function main() {
  const allJobs = await db.select().from(jobs);
  console.log("--- REVIEWING " + allJobs.length + " JOBS IN DATABASE ---");
  for (const job of allJobs) {
    console.log("Title: " + job.title);
    console.log("Company: " + job.companyName);
    console.log("Type: " + job.jobType);
    console.log("Source: " + job.sourceUrl);
    console.log("-----------------------------------");
  }
  process.exit(0);
}
main();
