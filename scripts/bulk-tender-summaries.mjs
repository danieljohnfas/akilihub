import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  max: 2,
  prepare: false,
  idle_timeout: 120,
  connect_timeout: 60,
});

// Build all summaries as a single massive UPDATE using CASE ... WHEN
// This avoids thousands of round trips. Process 2000 at a time.
async function bulkSummaries() {
  console.log('=== FAST BULK AI SUMMARIES FOR CLOSED TENDERS ===\n');

  let totalUpdated = 0;

  while (true) {
    const batch = await sql`
      SELECT id, title, contracting_authority, deadline, description
      FROM tenders
      WHERE ai_summary IS NULL OR LENGTH(TRIM(ai_summary)) < 10
      LIMIT 2000
    `;

    if (batch.length === 0) break;

    // Build values for a single batch update using unnest
    const ids       = [];
    const summaries = [];

    for (const t of batch) {
      let cleanDesc = (t.description || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      let snippet = cleanDesc.length > 50 ? cleanDesc.substring(0, 160).trim() : '';
      if (snippet && !snippet.endsWith('.')) snippet += '...';

      const dlStr = t.deadline ? new Date(t.deadline).toISOString().split('T')[0] : 'Not specified';
      const org   = (t.contracting_authority || '').trim() || 'The contracting authority';
      const title = (t.title || '').substring(0, 120);

      const summary = snippet
        ? `Tender notice for "${title}" issued by ${org}. ${snippet} Closing date: ${dlStr}.`
        : `Tender notice for "${title}" issued by ${org}. Closing date: ${dlStr}.`;

      ids.push(t.id);
      summaries.push(summary);
    }

    // Single SQL call using unnest for the entire batch
    await sql`
      UPDATE tenders
      SET ai_summary = data.summary, updated_at = NOW()
      FROM (SELECT unnest(${sql.array(ids)}::uuid[]) AS id, unnest(${sql.array(summaries)}::text[]) AS summary) AS data
      WHERE tenders.id = data.id
    `;

    totalUpdated += batch.length;
    console.log(`[Progress] Summaries generated: ${totalUpdated}`);
  }

  const [finalNull] = await sql`SELECT COUNT(*)::int as count FROM tenders WHERE ai_summary IS NULL OR LENGTH(TRIM(ai_summary)) < 10`;
  console.log(`\nFinal tenders missing ai_summary: ${finalNull.count}`);
  await sql.end();
  console.log('FAST BULK AI SUMMARIES COMPLETE! ✅\n');
}

bulkSummaries().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
