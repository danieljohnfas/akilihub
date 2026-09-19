import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL + '?sslmode=require', { max: 2 });

async function report() {
  console.log('=== AKILIHUB SYSTEM INTELLIGENCE AUDIT ===');
  
  // Jobs by Country
  const jobsByCountry = await sql`
    SELECT c.name, c.code, count(j.id)::int as job_count
    FROM countries c
    LEFT JOIN jobs j ON j.country_id = c.id
    GROUP BY c.name, c.code
    ORDER BY job_count DESC
  `;
  console.log('\n--- VERIFIED JOBS BY COUNTRY ---');
  let totalJobs = 0;
  for (const row of jobsByCountry) {
    console.log(`- ${row.name} (${row.code}): ${row.job_count}`);
    totalJobs += row.job_count;
  }
  console.log(`TOTAL VERIFIED JOBS: ${totalJobs}`);

  // Tenders by Country
  const tendersByCountry = await sql`
    SELECT c.name, c.code, count(t.id)::int as tender_count
    FROM countries c
    LEFT JOIN tenders t ON t.country_id = c.id
    GROUP BY c.name, c.code
    ORDER BY tender_count DESC
  `;
  console.log('\n--- VERIFIED OPEN TENDERS BY COUNTRY ---');
  let totalTenders = 0;
  for (const row of tendersByCountry) {
    console.log(`- ${row.name} (${row.code}): ${row.tender_count}`);
    totalTenders += row.tender_count;
  }
  console.log(`TOTAL VERIFIED OPEN TENDERS: ${totalTenders}`);

  // Other modules
  const [healthPoints] = await sql`SELECT count(*)::int as c FROM health_data_points`;
  const [healthInds] = await sql`SELECT count(*)::int as c FROM health_indicators`;
  const [compliance] = await sql`SELECT count(*)::int as c FROM compliance_requirements`;
  const [businesses] = await sql`SELECT count(*)::int as c FROM businesses`;
  const [salaries] = await sql`SELECT count(*)::int as c FROM salary_submissions`;

  console.log('\n--- PAN-AFRICAN CROSS-MODULE METRICS ---');
  console.log(`- Health Data Points: ${healthPoints.c}`);
  console.log(`- Health Indicators: ${healthInds.c}`);
  console.log(`- Compliance Requirements: ${compliance.c}`);
  console.log(`- Businesses Directory: ${businesses.c}`);
  console.log(`- Salary Benchmarks: ${salaries.c}`);
  
  await sql.end();
}

report().catch(err => {
  console.error(err);
  process.exit(1);
});
