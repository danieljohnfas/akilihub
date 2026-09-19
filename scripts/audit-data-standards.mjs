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
  console.error('DATABASE_URL missing');
  process.exit(1);
}

const sql = postgres(DATABASE_URL + '?sslmode=require', { max: 5 });

async function runAudit() {
  console.log('================================================================');
  console.log('🔍 FULL PROJECT DATA STANDARDS INTEGRITY AUDIT');
  console.log('================================================================\n');

  // 1. Check for any synthetic keywords
  const suspiciousJobs = await sql`
    SELECT id, title, company_name, source_url, length(description) as desc_len
    FROM jobs
    WHERE title ~* '(lorem|ipsum|dummy|placeholder|sample job|test job|fake)'
       OR description ~* '(lorem ipsum|fake description|sample description)'
       OR company_name ~* '(dummy|placeholder|test company|sample employer)'
       OR source_url ~* '(example.com|test.com|localhost)'
  `;

  console.log(`1. Synthetic / Placeholder Keyword Test:`);
  console.log(`   Matches found: ${suspiciousJobs.length} (Expected: 0)`);
  if (suspiciousJobs.length > 0) {
    console.table(suspiciousJobs);
  }

  // 2. Check for short descriptions (< 100 chars)
  const shortDescJobs = await sql`
    SELECT count(*)::int as count
    FROM jobs
    WHERE length(description) < 100
  `;
  console.log(`2. Short Description (< 100 chars) Test:`);
  console.log(`   Violations found: ${shortDescJobs[0].count} (Expected: 0)`);

  // 3. Check for NULL or unmapped country_id
  const unmappedJobs = await sql`
    SELECT count(*)::int as count
    FROM jobs
    WHERE country_id IS NULL
  `;
  console.log(`3. Unmapped Country Test:`);
  console.log(`   Violations found: ${unmappedJobs[0].count} (Expected: 0)`);

  // 4. Source URL Domain Breakdown for Jobs
  const jobSources = await sql`
    SELECT 
      substring(source_url from 'https?://([^/]+)') as domain,
      count(*)::int as count
    FROM jobs
    GROUP BY domain
    ORDER BY count DESC
  `;
  console.log(`\n4. Verified Jobs Source Domains:`);
  console.table(jobSources);

  // 5. Source URL Domain Breakdown for Tenders
  const tenderSources = await sql`
    SELECT 
      substring(source_url from 'https?://([^/]+)') as domain,
      count(*)::int as count
    FROM tenders
    GROUP BY domain
    ORDER BY count DESC
  `;
  console.log(`\n5. Verified Tenders Source Domains:`);
  console.table(tenderSources);

  // 6. Check Health Data Points
  const healthPoints = await sql`
    SELECT count(*)::int as count, min(year) as min_year, max(year) as max_year
    FROM health_data_points
  `;
  console.log(`\n6. Health Data Points Verification:`);
  console.log(`   Total points: ${healthPoints[0].count}, Years covered: ${healthPoints[0].min_year} - ${healthPoints[0].max_year}`);

  // 7. Sample 5 genuine jobs with full details
  const sampleJobs = await sql`
    SELECT j.title, j.company_name, c.name as country, j.location, length(j.description) as desc_len, j.source_url
    FROM jobs j
    JOIN countries c ON j.country_id = c.id
    ORDER BY j.created_at DESC
    LIMIT 5
  `;
  console.log(`\n7. Latest 5 Ingested Jobs Sample:`);
  console.table(sampleJobs);

  // 8. Sample 5 genuine tenders with full details
  const sampleTenders = await sql`
    SELECT t.title, t.authority, c.name as country, t.category, t.status, t.reference_no, t.source_url
    FROM tenders t
    JOIN countries c ON t.country_id = c.id
    ORDER BY t.created_at DESC
    LIMIT 5
  `;
  console.log(`\n8. Latest 5 Ingested Tenders Sample:`);
  console.table(sampleTenders);

  await sql.end();
}

runAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
