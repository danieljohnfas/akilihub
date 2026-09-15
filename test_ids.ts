import { db } from './src/lib/db/client';
import { jobs } from './src/lib/db/schema/jobs';
import { eq } from 'drizzle-orm';

async function check() {
  const ids = ['05d6b8c0-53e6-4f6d-a944-ff9e3a564e3b', 'fc873e0c-ae64-4e53-949f-01bf417d2cd0'];
  for (const id of ids) {
    const res = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.id, id));
    console.log(id, res.length > 0 ? 'EXISTS' : 'NOT FOUND');
  }
  process.exit(0);
}
check();
