import { db } from './src/lib/db/client';
import { sql } from 'drizzle-orm';

async function check() {
  console.log('--- SECTORS ---');
  const sectors = await db.execute(sql`SELECT sector, COUNT(*) as count FROM jobs GROUP BY sector ORDER BY count DESC LIMIT 10`);
  console.log(sectors);
  console.log('--- PROFESSIONS ---');
  const profs = await db.execute(sql`SELECT profession, COUNT(*) as count FROM jobs GROUP BY profession ORDER BY count DESC LIMIT 10`);
  console.log(profs);
  console.log('--- EDUCATION ---');
  const edus = await db.execute(sql`SELECT education_level, COUNT(*) as count FROM jobs GROUP BY education_level ORDER BY count DESC LIMIT 10`);
  console.log(edus);
  process.exit(0);
}
check();
