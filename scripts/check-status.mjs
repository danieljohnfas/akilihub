import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = vals.join('=').trim();
      }
    }
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
const sql = postgres(DATABASE_URL + '?sslmode=require', { max: 3 });

async function check() {
  const [jobsCount] = await sql`SELECT count(*)::int as count FROM jobs`;
  const [tendersCount] = await sql`SELECT count(*)::int as count FROM tenders`;
  const [healthPoints] = await sql`SELECT count(*)::int as count FROM health_data_points`;
  const [healthIndicators] = await sql`SELECT count(*)::int as count FROM health_indicators`;
  const [businessesCount] = await sql`SELECT count(*)::int as count FROM businesses`;
  const [complianceCount] = await sql`SELECT count(*)::int as count FROM compliance_requirements`;
  const [salaryCount] = await sql`SELECT count(*)::int as count FROM salary_submissions`;

  const jobsByCountry = await sql`
    SELECT c.code, c.name, count(j.id)::int as job_count
    FROM countries c
    LEFT JOIN jobs j ON j.country_id = c.id
    GROUP BY c.code, c.name
    ORDER BY job_count DESC
  `;

  const tendersByCountry = await sql`
    SELECT c.code, c.name, count(t.id)::int as tender_count
    FROM countries c
    LEFT JOIN tenders t ON t.country_id = c.id
    GROUP BY c.code, c.name
    ORDER BY tender_count DESC
  `;

  console.log('--- DATABASE INTELLIGENCE METRICS ---');
  console.log(`Jobs:                  ${jobsCount.count}`);
  console.log(`Tenders:               ${tendersCount.count}`);
  console.log(`Health Data Points:    ${healthPoints.count}`);
  console.log(`Health Indicators:     ${healthIndicators.count}`);
  console.log(`Businesses:            ${businessesCount.count}`);
  console.log(`Compliance Reqs:       ${complianceCount.count}`);
  console.log(`Salary Submissions:    ${salaryCount.count}`);

  console.log('\n--- JOBS BY COUNTRY ---');
  for (const row of jobsByCountry) {
    console.log(`  ${row.code.padEnd(4)} ${row.name.padEnd(32)}: ${row.job_count}`);
  }

  console.log('\n--- TENDERS BY COUNTRY ---');
  for (const row of tendersByCountry) {
    console.log(`  ${row.code.padEnd(4)} ${row.name.padEnd(32)}: ${row.tender_count}`);
  }

  await sql.end();
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
