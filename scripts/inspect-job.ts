import { db } from '../src/lib/db/client';
import { sql } from 'drizzle-orm';

async function main() {
  const result = await db.execute(sql`
    SELECT id, title, sector, profession, education_level, experience_level, skills, source_url, employer_url 
    FROM jobs 
    WHERE id = '1e7afa56-65c6-49c5-956f-d61c97a49b08'
  `);
  console.log(JSON.stringify(result[0], null, 2));
  process.exit(0);
}

main().catch(console.error);
