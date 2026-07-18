import { db } from '../src/lib/db/client';
import { sql } from 'drizzle-orm';

async function main() {
  console.log("--- JOBS (Websites Scraped by Country) ---");
  const jobsCount = await db.execute(sql`
    SELECT c.name as country, 
           count(DISTINCT substring(j.source_url from '.*://([^/]*)')) as websites
    FROM jobs j
    JOIN countries c ON j.country_id = c.id
    GROUP BY c.name;
  `);
  console.table(jobsCount);

  console.log("--- TENDERS (Websites Scraped by Country) ---");
  const tendersCount = await db.execute(sql`
    SELECT c.name as country, 
           count(DISTINCT substring(t.source_url from '.*://([^/]*)')) as websites
    FROM tenders t
    JOIN countries c ON t.country_id = c.id
    GROUP BY c.name;
  `);
  console.table(tendersCount);

  console.log("--- COMPLIANCE (Websites Scraped by Country) ---");
  const complianceCount = await db.execute(sql`
    SELECT c.name as country, 
           count(*) as count
    FROM businesses b
    JOIN countries c ON b.country_id = c.id
    GROUP BY c.name;
  `);
  console.table(complianceCount);

  process.exit(0);
}

main().catch(console.error);
