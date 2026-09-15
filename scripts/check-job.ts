import { db } from '../src/lib/db/client';
import { sql } from 'drizzle-orm';

async function main() {
  const result = await db.execute(sql`
    SELECT id, title, is_active, deadline, posted_date, source_url, employer_url 
    FROM jobs 
    WHERE id = '9f4c013b-8aed-4d2f-858c-decfa3b76d7c'
  `);
  console.log(JSON.stringify(result[0], null, 2));
  process.exit(0);
}
main();
