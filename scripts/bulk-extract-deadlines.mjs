import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 8, prepare: false });

const MONTH_MAP = {
  january: 0, jan: 0, januari: 0,
  february: 1, feb: 1, februari: 1,
  march: 2, mar: 2, machi: 2,
  april: 3, apr: 3, aprili: 3,
  may: 4, mei: 4,
  june: 5, jun: 5, juni: 5,
  july: 6, jul: 6, julai: 6,
  august: 7, aug: 7, agosti: 7,
  september: 8, sep: 8, sept: 8, septemba: 8,
  october: 9, oct: 9, oktoba: 9,
  november: 10, nov: 10, novemba: 10,
  december: 11, dec: 11, desemba: 11,
};

function extractDeadline(text) {
  if (!text) return null;

  // Pattern 1: Day Month Year (e.g., "by 26th June 2026", "closing date: 15 August 2026", "tarehe ya mwisho: 30 Septemba 2026")
  const rx1 = /(?:deadline|closing\s*date|closing|by|before|reach\s*us\s*on|later\s*than|tarehe\s*ya\s*mwisho|mwisho\s*wa\s*maombi|hadi\s*tarehe)[:\s]+(?:(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Jumatatu|Jumanne|Jumatano|Alhamisi|Ijumaa|Jumamosi|Jumapili)[,\s]*)?(\d{1,2})(?:st|nd|rd|th)?[\s\/\.-]+([A-Za-z]+)[\s\/\.-]+(\d{4})/i;
  const m1 = text.match(rx1);
  if (m1) {
    const day = parseInt(m1[1], 10);
    const monthStr = m1[2].toLowerCase();
    const year = parseInt(m1[3], 10);
    if (MONTH_MAP[monthStr] !== undefined && day >= 1 && day <= 31 && year >= 2022 && year <= 2030) {
      return new Date(Date.UTC(year, MONTH_MAP[monthStr], day, 23, 59, 59));
    }
  }

  // Pattern 2: Month Day, Year (e.g. "September 1, 2026", "August 26th, 2026")
  const rx2 = /(?:deadline|closing\s*date|closing|by|before)[:\s]+([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?[,\s]+(\d{4})/i;
  const m2 = text.match(rx2);
  if (m2) {
    const monthStr = m2[1].toLowerCase();
    const day = parseInt(m2[2], 10);
    const year = parseInt(m2[3], 10);
    if (MONTH_MAP[monthStr] !== undefined && day >= 1 && day <= 31 && year >= 2022 && year <= 2030) {
      return new Date(Date.UTC(year, MONTH_MAP[monthStr], day, 23, 59, 59));
    }
  }

  // Pattern 3: DD/MM/YYYY or DD-MM-YYYY (e.g. "Deadline: 31/10/2026", "Closing: 15-09-2026")
  const rx3 = /(?:deadline|closing\s*date|closing|mwisho)[:\s]+(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/i;
  const m3 = text.match(rx3);
  if (m3) {
    const day = parseInt(m3[1], 10);
    const month = parseInt(m3[2], 10) - 1;
    const year = parseInt(m3[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && year >= 2022 && year <= 2030) {
      return new Date(Date.UTC(year, month, day, 23, 59, 59));
    }
  }

  return null;
}

async function run() {
  console.log('Extracting deadlines from descriptions and updating active status across all jobs...\n');

  const [totalRes] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE deadline IS NULL AND description IS NOT NULL`;
  const total = totalRes.count;
  console.log(`Total jobs with NULL deadline to scan: ${total}`);

  const CHUNK = 500;
  const CONCURRENCY = 20;
  let offset = 0;
  let deadlinesFound = 0;
  let expiredCount = 0;
  const now = new Date();
  const startTime = Date.now();

  while (offset < total) {
    const rows = await sql`
      SELECT id, title, description, is_active
      FROM jobs
      WHERE deadline IS NULL AND description IS NOT NULL
      ORDER BY id
      LIMIT ${CHUNK} OFFSET ${offset}
    `;

    if (rows.length === 0) break;

    const updates = [];
    for (const r of rows) {
      const dl = extractDeadline(r.description);
      if (dl) {
        const isExpired = dl < now;
        updates.push({
          id: r.id,
          deadline: dl,
          isActive: !isExpired,
        });
        deadlinesFound++;
        if (isExpired) expiredCount++;
      }
    }

    // Execute updates
    for (let i = 0; i < updates.length; i += CONCURRENCY) {
      const slice = updates.slice(i, i + CONCURRENCY);
      await Promise.all(slice.map(u => sql`
        UPDATE jobs SET
          deadline = ${u.deadline},
          is_active = ${u.isActive},
          updated_at = NOW()
        WHERE id = ${u.id}
      `));
    }

    offset += rows.length;
    const elapsed = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    process.stdout.write(`\r[${((offset/total)*100).toFixed(1)}%] ${offset}/${total} | Deadlines found: ${deadlinesFound} | Expired deactivated: ${expiredCount} | Rate: ${Math.round(offset/elapsed)} rows/s`);
  }

  console.log(`\n\n🎉 Deadline Extraction Complete!`);
  console.log(`   Deadlines Discovered: ${deadlinesFound}`);
  console.log(`   Expired Jobs Marked Inactive: ${expiredCount}`);

  await sql.end();
}

run().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
