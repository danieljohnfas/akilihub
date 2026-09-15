import { db } from './src/lib/db/client';
import { sql } from 'drizzle-orm';

async function run() {
  console.log("Updating active jobs using raw SQL...");
  
  const query = sql`
    UPDATE jobs
    SET is_active = false
    WHERE (
        (CASE WHEN company_name IS NOT NULL AND LOWER(company_name) != 'unknown' THEN 10 ELSE 0 END) +
        (CASE WHEN title IS NOT NULL THEN 10 ELSE 0 END) +
        (CASE WHEN region_id IS NOT NULL THEN 10 ELSE 0 END) +
        (CASE WHEN deadline IS NOT NULL AND deadline > NOW() THEN 10 ELSE 0 END) +
        (CASE WHEN salary_min IS NOT NULL OR salary_max IS NOT NULL THEN 8 ELSE 0 END) +
        (CASE WHEN deadline IS NOT NULL THEN 8 ELSE 0 END) +
        (CASE WHEN description IS NOT NULL AND LENGTH(description) > 500 THEN 5 ELSE 0 END) +
        (CASE WHEN source_url IS NOT NULL AND source_url NOT LIKE '%google.com%' THEN 5 ELSE 0 END) +
        (CASE WHEN requirements IS NOT NULL AND LENGTH(requirements) > 0 THEN 5 ELSE 0 END)
    ) < 50;
  `;
  
  await db.execute(query);
  
  console.log("Done.");
  process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
