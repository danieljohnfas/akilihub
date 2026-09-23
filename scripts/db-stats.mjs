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
if (!DATABASE_URL) {
  console.error('DATABASE_URL is missing');
  process.exit(1);
}

const sql = postgres(DATABASE_URL + '?sslmode=require', { max: 5 });

async function run() {
  const jobs = await sql`
    SELECT c.code, c.name, COUNT(j.id)::int as count
    FROM countries c
    LEFT JOIN jobs j ON j.country_id = c.id
    GROUP BY c.code, c.name
    ORDER BY count DESC
  `;

  const tenders = await sql`
    SELECT c.code, c.name, COUNT(t.id)::int as count
    FROM countries c
    LEFT JOIN tenders t ON t.country_id = c.id
    GROUP BY c.code, c.name
    ORDER BY count DESC
  `;

  const [{ count: totalJobs }] = await sql`SELECT count(*)::int FROM jobs`;
  const [{ count: totalTenders }] = await sql`SELECT count(*)::int FROM tenders`;
  const [{ count: totalHealthPoints }] = await sql`SELECT count(*)::int FROM health_data_points`;
  const [{ count: totalHealthIndicators }] = await sql`SELECT count(*)::int FROM health_indicators`;
  const [{ count: totalBusinesses }] = await sql`SELECT count(*)::int FROM businesses`;
  const [{ count: totalCompliance }] = await sql`SELECT count(*)::int FROM compliance_requirements`;
  const [{ count: totalSalaries }] = await sql`SELECT count(*)::int FROM salary_submissions`;

  console.log('================================================================');
  console.log(`📊 LIVE DATABASE METRICS [${new Date().toISOString()}]`);
  console.log('================================================================');
  console.log(`Total Jobs:               ${totalJobs.toLocaleString()}`);
  console.log(`Total Tenders:            ${totalTenders.toLocaleString()}`);
  console.log(`Total Health Data Points: ${totalHealthPoints.toLocaleString()}`);
  console.log(`Total Health Indicators:  ${totalHealthIndicators.toLocaleString()}`);
  console.log(`Total Businesses:         ${totalBusinesses.toLocaleString()}`);
  console.log(`Total Compliance Items:   ${totalCompliance.toLocaleString()}`);
  console.log(`Total Salaries:           ${totalSalaries.toLocaleString()}`);
  console.log('\n--- JOBS BY COUNTRY ---');
  console.table(jobs);
  console.log('\n--- TENDERS BY COUNTRY ---');
  console.table(tenders);

  await sql.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
