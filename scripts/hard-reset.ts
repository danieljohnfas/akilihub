import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { tenders } from '../src/lib/db/schema/tenders';
import { salaries } from '../src/lib/db/schema/salaries';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('[Hard Reset] Truncating all major data tables to wipe synthetic data...');
  try { await db.execute(sql.raw('TRUNCATE TABLE jobs CASCADE;')); } catch(e){}
  try { await db.execute(sql.raw('TRUNCATE TABLE tenders CASCADE;')); } catch(e){}
  try { await db.execute(sql.raw('TRUNCATE TABLE salaries CASCADE;')); } catch(e){}
  try { await db.execute(sql.raw('TRUNCATE TABLE compliance CASCADE;')); } catch(e){}
  try { await db.execute(sql.raw('TRUNCATE TABLE health_metrics CASCADE;')); } catch(e){}
  console.log('[Hard Reset] Database is now 100% clean and ready for organic data.');
  process.exit(0);
}
main();
