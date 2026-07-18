import { db } from '../src/lib/db/client';
import { sql } from 'drizzle-orm';

async function main() {
  console.log("=== AI MODELS / SCRAPER AGENTS PERFORMANCE ===");
  
  const query = await db.execute(sql`
    SELECT 
      name,
      total_calls as "Total Requests",
      total_errors as "Failed Extractions",
      (total_calls - total_errors) as "Successful Extractions",
      CASE WHEN total_calls > 0 THEN 
        ROUND(((total_calls - total_errors)::numeric / total_calls::numeric) * 100, 1) || '%'
      ELSE '0%' END as "Success Rate",
      case when cool_until > extract(epoch from now()) * 1000 then 'COOLING DOWN' else 'ACTIVE' end as "Status"
    FROM ai_telemetry
    ORDER BY total_calls DESC;
  `);

  console.table(query);
  process.exit(0);
}

main().catch(console.error);
