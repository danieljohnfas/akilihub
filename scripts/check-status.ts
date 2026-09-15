import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
async function main() {
  const allJobs = await db.select().from(jobs);
  console.log(JSON.stringify(allJobs.map(j => ({title: j.title, isActive: j.isActive, deadline: j.deadline, needsAiExtraction: j.needsAiExtraction})), null, 2));
  process.exit(0);
}
main();
