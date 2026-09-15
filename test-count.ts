import { db } from './src/lib/db/client';
import { jobs } from './src/lib/db/schema/jobs';

async function main() {
  const result = await db.select().from(jobs).limit(3);
  console.log(result.map(j => ({ sector: j.sector, profession: j.profession, exp: j.experienceLevel })));
  process.exit(0);
}
main();
