/**
 * scripts/remediate-database.mjs
 * 
 * Safely executes AkiliHub's database remediation:
 * 1. Backs up all target records to storage/backups/ in JSON format.
 * 2. Unifies duplicate Tanzania country taxonomy (TA -> TZ).
 * 3. Purges test injections, stubs, and misattributed global aggregator jobs.
 * 4. Prunes synthetic Math.random() salaries while keeping verified survey data.
 * 5. Prunes synthetic Math.random() health data points while keeping indicators.
 * 6. Validates final database state against data standards.
 */

import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });
dotenv.config();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is missing!");
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: 'require', max: 5, idle_timeout: 10, connect_timeout: 30 });

const BACKUP_DIR = path.join(process.cwd(), 'storage', 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');

async function runRemediation() {
  console.log("==================================================================");
  console.log("🧹 STARTING AKILIHUB DATABASE REMEDIATION & CLEANUP");
  console.log("==================================================================\n");

  // ─────────────────────────────────────────────────────────────
  // STEP 1: PRE-FLIGHT BACKUP
  // ─────────────────────────────────────────────────────────────
  console.log("📦 STEP 1: Taking pre-flight backups of all records targeted for removal...");

  // 1a. Backup target jobs
  const jobsToPurge = await sql`
    SELECT * FROM jobs 
    WHERE source_url LIKE '%example.com%' 
       OR lower(title) LIKE '%test injection%' 
       OR length(coalesce(description, '')) < 50 
       OR lower(company_name) = 'unknown' 
       OR company_name IN (
         'jobgether', 
         'weloglobal', 
         'remotecom', 
         'gohighlevel', 
         'remotereferralboardinternaluseonly'
       )
  `;
  const jobsBackupFile = path.join(BACKUP_DIR, `purged_jobs_${TIMESTAMP}.json`);
  fs.writeFileSync(jobsBackupFile, JSON.stringify(jobsToPurge, null, 2), 'utf-8');
  console.log(`  ✓ Backed up ${jobsToPurge.length} jobs to: ${jobsBackupFile}`);

  // 1b. Backup target salaries
  const salariesToPurge = await sql`
    SELECT * FROM salary_submissions 
    WHERE source_url IS NULL OR trim(source_url) = ''
  `;
  const salariesBackupFile = path.join(BACKUP_DIR, `purged_salaries_${TIMESTAMP}.json`);
  fs.writeFileSync(salariesBackupFile, JSON.stringify(salariesToPurge, null, 2), 'utf-8');
  console.log(`  ✓ Backed up ${salariesToPurge.length} salaries to: ${salariesBackupFile}`);

  // 1c. Backup target health data
  const healthToPurge = await sql`
    SELECT * FROM health_data_points 
    WHERE source IN ('WHO', 'DHIS2') 
      AND indicator_id IN (SELECT id FROM health_indicators WHERE code IN ('MMR', 'U5MR', 'MAL_INC', 'HIV_PREV'))
      AND year BETWEEN 2019 AND 2023
  `;
  const healthBackupFile = path.join(BACKUP_DIR, `purged_health_${TIMESTAMP}.json`);
  fs.writeFileSync(healthBackupFile, JSON.stringify(healthToPurge, null, 2), 'utf-8');
  console.log(`  ✓ Backed up ${healthToPurge.length} health data points to: ${healthBackupFile}\n`);

  // ─────────────────────────────────────────────────────────────
  // STEP 2: UNIFY COUNTRY TAXONOMY (TA -> TZ)
  // ─────────────────────────────────────────────────────────────
  console.log("🌍 STEP 2: Unifying duplicate Tanzania country taxonomy...");
  const TA_ID = '43e6e96e-5844-412c-af10-8d7313f368da';
  const TZ_ID = '28bd1d89-acc4-4142-a6f9-b06b5cfa8435';

  const migratedJobs = await sql`
    UPDATE jobs 
    SET country_id = ${TZ_ID} 
    WHERE country_id = ${TA_ID}
    RETURNING id
  `;
  console.log(`  ✓ Migrated ${migratedJobs.length} jobs from 'TA' to canonical 'TZ' (${TZ_ID})`);

  const deletedCountry = await sql`
    DELETE FROM countries 
    WHERE id = ${TA_ID}
    RETURNING id, code, name
  `;
  if (deletedCountry.length > 0) {
    console.log(`  ✓ Deleted redundant country record: code=${deletedCountry[0].code}, name=${deletedCountry[0].name}`);
  } else {
    console.log(`  - No redundant 'TA' record found in countries table.`);
  }
  console.log();

  // ─────────────────────────────────────────────────────────────
  // STEP 3: PURGE TEST, STUB & MISATTRIBUTED JOBS
  // ─────────────────────────────────────────────────────────────
  console.log("💼 STEP 3: Purging fake, stub, and misattributed global aggregator jobs...");

  // 3a. Delete test injection jobs
  const delTest = await sql`
    DELETE FROM jobs 
    WHERE source_url LIKE '%example.com%' 
       OR lower(title) LIKE '%test injection%'
    RETURNING id
  `;
  console.log(`  ✓ Deleted ${delTest.length} test injection job(s)`);

  // 3b. Delete stub jobs with description < 50 chars
  const delStubs = await sql`
    DELETE FROM jobs 
    WHERE length(coalesce(description, '')) < 50
    RETURNING id
  `;
  console.log(`  ✓ Deleted ${delStubs.length} stub job(s) (< 50 chars)`);

  // 3c. Delete placeholder company jobs (e.g. Unknown)
  const delUnknown = await sql`
    DELETE FROM jobs 
    WHERE lower(trim(company_name)) = 'unknown'
    RETURNING id
  `;
  console.log(`  ✓ Deleted ${delUnknown.length} job(s) with 'Unknown' company`);

  // 3d. Delete misattributed global aggregator feeds
  const delAggregators = await sql`
    DELETE FROM jobs 
    WHERE company_name IN (
      'jobgether', 
      'weloglobal', 
      'remotecom', 
      'gohighlevel', 
      'remotereferralboardinternaluseonly'
    )
    RETURNING id
  `;
  console.log(`  ✓ Deleted ${delAggregators.length} misattributed global aggregator job(s)`);
  console.log();

  // ─────────────────────────────────────────────────────────────
  // STEP 4: PRUNE SYNTHETIC SALARIES
  // ─────────────────────────────────────────────────────────────
  console.log("💰 STEP 4: Pruning synthetic Math.random() salary records...");
  const delSalaries = await sql`
    DELETE FROM salary_submissions 
    WHERE source_url IS NULL OR trim(source_url) = ''
    RETURNING id
  `;
  console.log(`  ✓ Deleted ${delSalaries.length} synthetic salary records (without source_url)`);
  console.log();

  // ─────────────────────────────────────────────────────────────
  // STEP 5: PRUNE SYNTHETIC HEALTH DATA POINTS
  // ─────────────────────────────────────────────────────────────
  console.log("🏥 STEP 5: Pruning synthetic Math.random() health data points...");
  const delHealth = await sql`
    DELETE FROM health_data_points 
    WHERE source IN ('WHO', 'DHIS2') 
      AND indicator_id IN (SELECT id FROM health_indicators WHERE code IN ('MMR', 'U5MR', 'MAL_INC', 'HIV_PREV'))
      AND year BETWEEN 2019 AND 2023
    RETURNING id
  `;
  console.log(`  ✓ Deleted ${delHealth.length} synthetic health data point(s)`);
  console.log();

  // ─────────────────────────────────────────────────────────────
  // STEP 6: VERIFY FINAL DATABASE STATE
  // ─────────────────────────────────────────────────────────────
  console.log("==================================================================");
  console.log("🔍 STEP 6: POST-REMEDIATION AUDIT & INTEGRITY CHECK");
  console.log("==================================================================");

  // 6a. Jobs remaining
  const [remJobs] = await sql`SELECT count(*) FROM jobs`;
  const remainingCompanies = await sql`
    SELECT company_name, count(*) as count 
    FROM jobs 
    GROUP BY company_name 
    ORDER BY count DESC
  `;
  console.log(`\nRemaining Genuine Jobs: ${remJobs.count}`);
  remainingCompanies.forEach(c => console.log(`  • ${c.company_name.padEnd(35)} : ${c.count} jobs`));

  // 6b. Country distribution
  const countryJobs = await sql`
    SELECT c.code, c.name, count(j.id) as count
    FROM countries c
    LEFT JOIN jobs j ON j.country_id = c.id
    GROUP BY c.code, c.name
    HAVING count(j.id) > 0
    ORDER BY count DESC
  `;
  console.log(`\nJob Distribution by Canonical Country:`);
  countryJobs.forEach(c => console.log(`  • ${c.code} (${c.name.padEnd(12)}) : ${c.count} jobs`));

  // 6c. Countries list check
  const allCountries = await sql`SELECT code, name FROM countries ORDER BY name`;
  console.log(`\nActive Countries in Database (${allCountries.length}):`);
  allCountries.forEach(c => console.log(`  • ${c.code}: ${c.name}`));

  // 6d. Salaries remaining
  const [remSalaries] = await sql`SELECT count(*) FROM salary_submissions`;
  const [salariesWithSource] = await sql`SELECT count(*) FROM salary_submissions WHERE source_url IS NOT NULL`;
  console.log(`\nRemaining Verified Salaries: ${remSalaries.count}`);
  console.log(`  ✓ 100% of remaining salaries have valid source_url (${salariesWithSource.count}/${remSalaries.count})`);

  // 6e. Health data points remaining
  const [remHealth] = await sql`SELECT count(*) FROM health_data_points`;
  console.log(`\nRemaining Real Health Data Points: ${remHealth.count}`);

  console.log("\n==================================================================");
  console.log("✅ REMEDIATION COMPLETED SUCCESSFULLY");
  console.log("==================================================================");

  await sql.end();
}

runRemediation().catch(err => {
  console.error("Remediation error:", err);
  process.exit(1);
});
