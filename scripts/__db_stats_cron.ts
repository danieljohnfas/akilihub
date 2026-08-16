import { db } from '../src/lib/db/client.ts';
import { sql } from 'drizzle-orm';
async function run() {
  const r = await db.execute(sql`SELECT
    (SELECT count(*)::int FROM jobs WHERE is_active = true) AS jobs,
    (SELECT count(*)::int FROM tenders WHERE status = 'open') AS tenders,
    (SELECT count(*)::int FROM compliance_requirements WHERE is_active = true) AS compliance,
    (SELECT count(*)::int FROM guides) AS guides,
    (SELECT count(*)::int FROM jobs WHERE employer_url IS NULL AND is_active = true) AS jobs_url_missing,
    (SELECT count(*)::int FROM tenders WHERE employer_url IS NULL) AS tenders_url_missing,
    (SELECT count(*)::int FROM jobs WHERE length(description) < 300 AND is_active = true) AS jobs_shallow,
    (SELECT count(*)::int FROM tenders WHERE length(coalesce(description,'')) < 200 AND status = 'open') AS tenders_shallow
  `);
  console.log(JSON.stringify(r[0], null, 2));
  process.exit(0);
}
run().catch(e=>{console.error(e);process.exit(1);});
