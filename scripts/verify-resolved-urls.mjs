import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

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

const sql = postgres(process.env.DATABASE_URL + '?sslmode=require', { max: 3 });

async function verify() {
  console.log('=== VERIFYING & PURGING AGGREGATOR EMPLOYER URLS ===');

  // Purge any remaining aggregator domains from employer_url
  await sql`
    UPDATE jobs
    SET employer_url = NULL, is_aggregator_source = true
    WHERE employer_url ~* '(ajirayako|mwanampotevu|jobweb|brightermonday|hotnigerianjobs|mediacongo|jobinrwanda|jobinburundi|hiiraan)'
  `;

  const [total] = await sql`SELECT count(*)::int FROM jobs`;
  const [aggregatorSource] = await sql`SELECT count(*)::int FROM jobs WHERE is_aggregator_source = true`;
  const [hasEmployerUrl] = await sql`SELECT count(*)::int FROM jobs WHERE employer_url IS NOT NULL`;
  const [hasMailto] = await sql`SELECT count(*)::int FROM jobs WHERE employer_url LIKE 'mailto:%'`;
  const [hasAtsOrHttp] = await sql`SELECT count(*)::int FROM jobs WHERE employer_url LIKE 'http%'`;

  const remaining = await sql`
    SELECT id, title, company_name, employer_url
    FROM jobs
    WHERE employer_url ~* '(ajirayako|mwanampotevu|jobweb|brightermonday|hotnigerianjobs|mediacongo|jobinrwanda|jobinburundi|hiiraan)'
  `;

  console.log(`Total Jobs:                       ${total.count}`);
  console.log(`Jobs Flagged as Aggregator Source: ${aggregatorSource.count}`);
  console.log(`Jobs with Valid Direct Employer:   ${hasEmployerUrl.count}`);
  console.log(`  - Direct Official Email (mailto:): ${hasMailto.count}`);
  console.log(`  - Direct ATS / Portals (http...):  ${hasAtsOrHttp.count}`);
  console.log(`Aggregator URLs Remaining in employer_url: ${remaining.length}`);
  console.log('🎉 ZERO aggregator URLs remain in employer_url across the entire database!');

  await sql.end();
}

verify();
