import { db } from './src/lib/db/client';
import { jobs } from './src/lib/db/schema/jobs';
import { sql } from 'drizzle-orm';

async function main() {
  const result = await db.execute(sql.raw("SELECT substring(source_url from '^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)') as domain, count(*) FROM jobs GROUP BY domain ORDER BY count(*) DESC LIMIT 20"));
  console.log('Top 20 Domains in remaining jobs:');
  result.rows.forEach(r => console.log(r.domain, '-', r.count));
  process.exit(0);
}
main();
