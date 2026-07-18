import { db } from '../src/lib/db/client';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Fetching estimated table counts...');
  try {
    const res = await db.execute(sql`
      SELECT relname as table_name, n_live_tup as count
      FROM pg_stat_user_tables
      WHERE relname IN ('jobs', 'tenders', 'businesses', 'salaries', 'health_data', 'users');
    `);

    console.log('=== Database Counts (Estimated) ===');
    for (const row of res) {
      console.log(`${row.table_name}: ${row.count}`);
    }
  } catch (err) {
    console.error('Error counting data:', err);
  } finally {
    process.exit(0);
  }
}

main();
