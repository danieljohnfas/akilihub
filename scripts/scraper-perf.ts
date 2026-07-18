import { db } from '../src/lib/db/client';
import { sql } from 'drizzle-orm';

async function main() {
  console.log("=== SCRAPER PERFORMANCE (Records per Domain) ===");

  const query = await db.execute(sql`
    WITH all_records AS (
      SELECT source_url, 'jobs' as category FROM jobs
      UNION ALL
      SELECT source_url, 'tenders' as category FROM tenders
    )
    SELECT 
      substring(source_url from '.*://([^/]*)') as domain,
      category,
      count(*) as records
    FROM all_records
    GROUP BY domain, category
    ORDER BY count(*) DESC;
  `);

  console.table(query);
  process.exit(0);
}

main().catch(console.error);
