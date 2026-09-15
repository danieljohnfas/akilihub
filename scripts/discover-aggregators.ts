import { db } from '../src/lib/db/client';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('🔍 Step 1: Discovering top source domains...');
  const domains = await db.execute(sql`
    SELECT 
      regexp_replace(source_url, '^https?://([^/]+).*', '\\1') AS domain,
      COUNT(*) AS total,
      SUM(CASE WHEN employer_url IS NOT NULL 
        AND regexp_replace(employer_url, '^https?://([^/]+).*', '\\1') = regexp_replace(source_url, '^https?://([^/]+).*', '\\1') 
        THEN 1 ELSE 0 END) AS same_domain_employer_count
    FROM jobs
    WHERE is_active = true
    GROUP BY domain
    HAVING COUNT(*) > 10
    ORDER BY total DESC
    LIMIT 60
  `);
  console.log(JSON.stringify(domains, null, 2));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
