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

// Realistic salary ranges per currency (min and max, based on local market).
// These are VERY generous to avoid flagging legitimate senior salaries.
// The RWF 380M/month and ETB 80/month are the real outliers.
const SALARY_RANGES = {
  KES: { min: 10000,    max: 2000000,  note: 'Kenya Shilling — normal KES 10k-2M/mo' },
  TZS: { min: 200000,   max: 15000000, note: 'Tanzania Shilling — normal TZS 200k-15M/mo' },
  UGX: { min: 200000,   max: 15000000, note: 'Uganda Shilling — normal UGX 200k-15M/mo' },
  ETB: { min: 1500,     max: 150000,   note: 'Ethiopian Birr — normal ETB 1.5k-150k/mo' },
  RWF: { min: 30000,    max: 5000000,  note: 'Rwandan Franc — normal RWF 30k-5M/mo' },
  GHS: { min: 500,      max: 80000,    note: 'Ghanaian Cedi — normal GHS 500-80k/mo' },
  NGN: { min: 30000,    max: 10000000, note: 'Nigerian Naira — normal NGN 30k-10M/mo' },
  ZMW: { min: 1000,     max: 200000,   note: 'Zambian Kwacha — normal ZMW 1k-200k/mo' },
  USD: { min: 100,      max: 50000,    note: 'US Dollar — normal USD 100-50k/mo' },
  EUR: { min: 100,      max: 40000,    note: 'Euro — normal EUR 100-40k/mo' },
  GBP: { min: 100,      max: 30000,    note: 'British Pound — normal GBP 100-30k/mo' },
  ZAR: { min: 3000,     max: 500000,   note: 'South African Rand — normal ZAR 3k-500k/mo' },
};

function assessPlausibility(row) {
  const gross = parseFloat(row.gross_monthly_salary || 0);
  const net   = parseFloat(row.net_monthly_salary || 0);
  const salary = gross || net;

  if (!salary || salary <= 0) return { ok: false, reason: 'Zero/null salary' };

  const range = SALARY_RANGES[row.currency];
  if (!range) return { ok: true, reason: `Unknown currency ${row.currency} — skip` };

  if (salary < range.min) return { ok: false, reason: `${salary.toLocaleString()} ${row.currency} below min ${range.min.toLocaleString()} (${range.note})` };
  if (salary > range.max) return { ok: false, reason: `${salary.toLocaleString()} ${row.currency} exceeds max ${range.max.toLocaleString()} (${range.note})` };

  if (gross > 0 && net > 0 && net > gross * 1.02) {
    return { ok: false, reason: `Net (${net}) > Gross (${gross}) — impossible` };
  }

  return { ok: true, reason: 'Plausible' };
}

async function reviewSalaries() {
  console.log('=== SALARY SUBMISSIONS REVIEW & VERIFICATION ===\n');

  const rows = await sql`
    SELECT 
      ss.id, ss.job_title, ss.country_id, ss.currency,
      ss.gross_monthly_salary, ss.net_monthly_salary,
      ss.years_of_experience, ss.is_verified,
      c.name as country_name
    FROM salary_submissions ss
    LEFT JOIN countries c ON ss.country_id = c.id
    ORDER BY ss.is_verified, ss.gross_monthly_salary DESC
  `;

  console.log(`Total salary submissions: ${rows.length}`);
  console.log(`Currently verified:  ${rows.filter(r => r.is_verified).length}`);
  console.log(`Currently unverified: ${rows.filter(r => !r.is_verified).length}\n`);

  const toVerify    = [];
  const toFlag      = [];
  const toUnverify  = [];  // previously verified but implausible

  for (const row of rows) {
    const { ok, reason } = assessPlausibility(row);
    if (!ok) {
      if (row.is_verified) toUnverify.push({ row, reason });
      else toFlag.push({ row, reason });
    } else if (!row.is_verified) {
      toVerify.push(row);
    }
  }

  console.log(`Plausible unverified  → auto-verify: ${toVerify.length}`);
  console.log(`Implausible (new):                   ${toFlag.length}`);
  console.log(`Implausible (was verified, revert):  ${toUnverify.length}\n`);

  // Revert wrongly-verified implausible entries
  if (toUnverify.length > 0) {
    console.log('--- REVERTING WRONGLY-VERIFIED IMPLAUSIBLE ENTRIES ---');
    for (const { row, reason } of toUnverify) {
      console.log(`  ✗ [${row.currency}] ${row.job_title} (${row.country_name}) — ${reason}`);
      await sql`UPDATE salary_submissions SET is_verified = false WHERE id = ${row.id}`;
    }
    console.log(`  → Reverted ${toUnverify.length} entries.\n`);
  }

  // Show new implausible (already unverified, just log)
  if (toFlag.length > 0) {
    console.log('--- IMPLAUSIBLE UNVERIFIED (already flagged as unverified) ---');
    for (const { row, reason } of toFlag) {
      console.log(`  ✗ [${row.currency}] ${row.job_title} (${row.country_name}) — ${reason}`);
    }
    console.log();
  }

  // Auto-verify plausible unverified
  if (toVerify.length > 0) {
    console.log('--- AUTO-VERIFYING PLAUSIBLE SUBMISSIONS ---');
    for (const row of toVerify) {
      console.log(`  ✓ [${row.currency}] ${row.job_title} (${row.country_name}) — ${row.gross_monthly_salary}`);
      await sql`UPDATE salary_submissions SET is_verified = true WHERE id = ${row.id}`;
    }
    console.log(`  → Verified ${toVerify.length} entries.\n`);
  }

  const [finalVerified] = await sql`SELECT COUNT(*)::int as count FROM salary_submissions WHERE is_verified = true`;
  const [finalTotal]    = await sql`SELECT COUNT(*)::int as count FROM salary_submissions`;
  console.log(`\nFinal: ${finalVerified.count}/${finalTotal.count} salary submissions verified.`);

  await sql.end();
  console.log('\nSALARY SUBMISSIONS REVIEW COMPLETE! ✅\n');
}

reviewSalaries().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
