import { db } from './src/lib/db/client';
import { jobs } from './src/lib/db/schema/jobs';
import { isNotNull, ne } from 'drizzle-orm';

async function main() {
  const result = await db.select().from(jobs).where(ne(jobs.description, 'Detailed job description is available on the original posting site.')).limit(5);
  for(let i=0; i<result.length; i++) {
    console.log('JOB ' + i + ':');
    console.log(result[i].description.slice(0, 500));
    console.log('---');
  }
  process.exit(0);
}
main();
