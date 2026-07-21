/**
 * Fix misattributed compliance_requirements rows:
 * Update source_url from gerpat consulting blog → official TRA website
 * for any row where source_url contains 'gerpat'.
 *
 * Run with: npx tsx scripts/fix-compliance-urls.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');

  const result = await sql`
    UPDATE compliance_requirements
    SET source_url = 'https://www.tra.go.tz/'
    WHERE source_url LIKE '%gerpat%'
    RETURNING id
  `;

  console.log(`✅ Updated ${result.length} compliance_requirements row(s) with gerpat source_url → https://www.tra.go.tz/`);

  await sql.end();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Fix failed:', err);
  process.exit(1);
});
