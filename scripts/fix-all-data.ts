/**
 * Fix All Data Issues
 * -------------------
 * 1. Re-run health upsert → updates category + source on all existing indicators/data points
 * 2. Fix decimal years_of_experience in salary_submissions (rounds all floats to int)
 * 3. Re-run DRC salary scrape with fixed saveSalariesDb (now allows null catId)
 */
import { fetchAllHealthIndicators } from '../src/lib/scrapers/health-world-bank';
import { discoverSalaries } from '../src/lib/scrapers/broad-search-engine-salaries';
import { saveSalariesDb } from '../src/inngest/scrape-salaries';
import { db } from '../src/lib/db/client';
import { salarySubmissions } from '../src/lib/db/schema/salaries';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('=======================================================');
  console.log('  DATA FIX: Health categories + source, Salaries DRC,');
  console.log('            decimal years_of_experience');
  console.log('=======================================================\n');

  // ── Fix 1: Re-upsert all health data (sets category + correct source) ────────
  console.log('\n[Fix 1] Re-upserting health indicators with correct category + source...');
  try {
    const count = await fetchAllHealthIndicators();
    console.log(`✅ Health: ${count} data points re-upserted with correct category + source.\n`);
  } catch (err: any) {
    console.error('❌ Health re-upsert failed:', err.message);
  }

  // ── Fix 2: Round decimal years_of_experience in DB ───────────────────────────
  console.log('[Fix 2] Rounding decimal years_of_experience in salary_submissions...');
  try {
    const result = await db.execute(
      sql`UPDATE salary_submissions
          SET years_of_experience = ROUND(years_of_experience)
          WHERE years_of_experience IS NOT NULL
            AND years_of_experience != FLOOR(years_of_experience)`
    );
    console.log(`✅ Salary: Fixed decimal years_of_experience rows.\n`);
  } catch (err: any) {
    console.error('❌ Salary decimal fix failed:', err.message);
  }

  // ── Fix 3: Re-scrape DRC salaries (now with null catId allowed) ──────────────
  console.log('[Fix 3] Re-scraping DRC salaries (French job titles, null catId allowed)...');
  try {
    const discovered = await discoverSalaries(
      'salaire moyen développeur logiciel comptable enseignant médecin RDC Congo 2026 CDF franc',
      6  // increased from 3 to 6 for better coverage
    );
    console.log(`  Found ${discovered.length} salary data points for DRC.`);
    if (discovered.length > 0) {
      const inserted = await saveSalariesDb(discovered, 'CD');
      console.log(`✅ DRC Salaries: Inserted ${inserted} new salary records.\n`);
    } else {
      console.log('⚠️  DRC: No salary data found.\n');
    }
  } catch (err: any) {
    console.error('❌ DRC salary scrape failed:', err.message);
  }

  console.log('\n=======================================================');
  console.log('  All fixes complete.');
  console.log('=======================================================');
  process.exit(0);
}

main().catch(err => {
  console.error('[Fatal]', err);
  process.exit(1);
});
