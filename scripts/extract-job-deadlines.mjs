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
  idle_timeout: 120,
  connect_timeout: 60,
});

async function extractDeadlines() {
  console.log('================================================================');
  console.log('            EXTRACTING APPLICATION DEADLINES FROM TEXT          ');
  console.log('================================================================\n');

  const [before] = await sql`SELECT COUNT(*)::int as c FROM jobs WHERE is_active = true AND deadline IS NULL`;
  console.log(`Active jobs missing deadline before: ${before.c}`);

  // Fetch active jobs missing deadline with description or requirements
  const jobs = await sql`
    SELECT id, title, posted_date, created_at, description, requirements
    FROM jobs
    WHERE is_active = true AND deadline IS NULL
      AND (
        (description IS NOT NULL AND description ~* '(deadline|closing date|apply before|application closes|valid until|last date)')
        OR (requirements IS NOT NULL AND requirements ~* '(deadline|closing date|apply before|application closes|valid until|last date)')
      )
  `;

  console.log(`Candidate jobs with deadline keywords: ${jobs.length}\n`);

  const months = {
    january: 0, jan: 0,
    february: 1, feb: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sep: 8, sept: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11
  };

  const monthRegex = '(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)';

  let updatedCount = 0;
  let expiredCount = 0;

  for (const job of jobs) {
    const text = `${job.description || ''} ${job.requirements || ''}`;
    let extractedDate = null;

    // Pattern 1: DD Month YYYY (e.g. 15 October 2026, 31st August 2026)
    const p1 = new RegExp(`(?:deadline|closing date|apply before|closes on|due date)[^\\w\\n]{1,25}(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthRegex})\\s+(\\d{4})`, 'i');
    const m1 = text.match(p1);
    if (m1) {
      const day = parseInt(m1[1], 10);
      const mIdx = months[m1[2].toLowerCase()];
      const year = parseInt(m1[3], 10);
      if (mIdx !== undefined && year >= 2020 && year <= 2030 && day >= 1 && day <= 31) {
        extractedDate = new Date(Date.UTC(year, mIdx, day, 23, 59, 59));
      }
    }

    // Pattern 2: Month DD, YYYY (e.g. October 15, 2026)
    if (!extractedDate) {
      const p2 = new RegExp(`(?:deadline|closing date|apply before|closes on|due date)[^\\w\\n]{1,25}(${monthRegex})\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})`, 'i');
      const m2 = text.match(p2);
      if (m2) {
        const mIdx = months[m2[1].toLowerCase()];
        const day = parseInt(m2[2], 10);
        const year = parseInt(m2[3], 10);
        if (mIdx !== undefined && year >= 2020 && year <= 2030 && day >= 1 && day <= 31) {
          extractedDate = new Date(Date.UTC(year, mIdx, day, 23, 59, 59));
        }
      }
    }

    // Pattern 3: YYYY-MM-DD or DD/MM/YYYY
    if (!extractedDate) {
      const p3 = /(?:deadline|closing date|apply before)[^\w\n]{1,25}(\d{4})[-/](\d{1,2})[-/](\d{1,2})/i;
      const m3 = text.match(p3);
      if (m3) {
        const year = parseInt(m3[1], 10);
        const month = parseInt(m3[2], 10) - 1;
        const day = parseInt(m3[3], 10);
        if (year >= 2020 && year <= 2030 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
          extractedDate = new Date(Date.UTC(year, month, day, 23, 59, 59));
        }
      }
    }

    if (extractedDate && !isNaN(extractedDate.getTime())) {
      const now = new Date();
      const isPast = extractedDate < now;

      await sql`
        UPDATE jobs
        SET deadline = ${extractedDate.toISOString()},
            is_active = CASE WHEN ${isPast} THEN false ELSE is_active END,
            updated_at = NOW()
        WHERE id = ${job.id}
      `;
      updatedCount++;
      if (isPast) expiredCount++;
    }
  }

  console.log(`  ✓ Extracted and updated deadlines for ${updatedCount} jobs`);
  console.log(`  ✓ Deactivated ${expiredCount} expired jobs whose deadlines had passed\n`);

  // For remaining active jobs with no stated deadline:
  // Set an estimated standard window: posted_date (or created_at) + 30 days
  const rDefault = await sql`
    UPDATE jobs
    SET deadline = COALESCE(posted_date, created_at, NOW()) + INTERVAL '30 days',
        updated_at = NOW()
    WHERE is_active = true AND deadline IS NULL
    RETURNING id
  `;
  console.log(`  ✓ Populated estimated 30-day application deadline for ${rDefault.length} active jobs without explicit dates\n`);

  // Deactivate any active jobs where the newly populated deadline is already in the past
  const rExpirePast = await sql`
    UPDATE jobs
    SET is_active = false, updated_at = NOW()
    WHERE is_active = true AND deadline < NOW()
    RETURNING id
  `;
  console.log(`  ✓ Cleaned up: deactivated ${rExpirePast.length} past-deadline jobs`);

  const [after] = await sql`SELECT COUNT(*)::int as c FROM jobs WHERE is_active = true AND deadline IS NULL`;
  console.log(`\nActive jobs still missing deadline: ${after.c} (Must be 0)`);

  const [activeCount] = await sql`SELECT COUNT(*)::int as c FROM jobs WHERE is_active = true`;
  console.log(`Total live, valid, active jobs now: ${activeCount.c}`);

  await sql.end();
}

extractDeadlines().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
