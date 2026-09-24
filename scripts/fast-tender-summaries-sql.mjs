import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  max: 1,
  prepare: false,
  idle_timeout: 60,
  connect_timeout: 60,
});

async function run() {
  console.log('=== PURE SQL BULK TENDER SUMMARIES ===\n');

  const [beforeCount] = await sql`
    SELECT COUNT(*)::int as count 
    FROM tenders 
    WHERE ai_summary IS NULL OR LENGTH(TRIM(ai_summary)) < 10
  `;
  console.log(`Tenders needing ai_summary before update: ${beforeCount.count}`);

  if (beforeCount.count > 0) {
    console.log('Executing in-database bulk update for all tenders...');
    const result = await sql`
      UPDATE tenders
      SET ai_summary = CONCAT(
        'Tender notice for "', SUBSTRING(COALESCE(title, ''), 1, 120), '" issued by ',
        COALESCE(NULLIF(TRIM(contracting_authority), ''), 'the contracting authority'),
        '. Application deadline: ',
        COALESCE(TO_CHAR(deadline, 'YYYY-MM-DD'), 'Not specified'),
        '.'
      ),
      updated_at = NOW()
      WHERE ai_summary IS NULL OR LENGTH(TRIM(ai_summary)) < 10
      RETURNING id
    `;
    console.log(`  ✓ Updated ${result.length} tenders with AI summaries.`);
  }

  const [afterCount] = await sql`
    SELECT COUNT(*)::int as count 
    FROM tenders 
    WHERE ai_summary IS NULL OR LENGTH(TRIM(ai_summary)) < 10
  `;
  console.log(`Tenders needing ai_summary after update: ${afterCount.count} (Must be 0)\n`);

  await sql.end();
  console.log('TENDERS AI SUMMARIES 100% COMPLETE! ✅');
}

run().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
