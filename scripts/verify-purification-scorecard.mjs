import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false });

async function verifyPurification() {
  console.log('================================================================');
  console.log('             PURIFICATION POST-AUDIT SCORECARD                 ');
  console.log('================================================================\n');

  const [ads] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE description LIKE '%adsbygoogle%'`;
  const [sub] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE description LIKE '%Never Miss a Job Update Again%' OR description LIKE '%Click Here to Subscribe%'`;
  const [mailto] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE employer_url LIKE 'mailto:%'`;
  const [placeholders] = await sql`
    SELECT COUNT(*)::int as count FROM jobs 
    WHERE company_name ILIKE '%verified employer%' 
       OR company_name ILIKE '%tanzanian employer%' 
       OR company_name ILIKE '%anonymous employer%'
  `;
  const sectors = await sql`
    SELECT sector, COUNT(*)::int as count 
    FROM jobs 
    GROUP BY sector 
    ORDER BY count DESC
  `;

  console.log(`Jobs with AdSense code:        ${ads.count} (Must be 0)`);
  console.log(`Jobs with newsletter CTAs:     ${sub.count} (Must be 0)`);
  console.log(`Jobs with mailto in URL:       ${mailto.count} (Must be 0)`);
  console.log(`Jobs with placeholder company: ${placeholders.count} (Was 1,931)`);

  console.log('\n--- NEW SECTOR DISTRIBUTION ---');
  for (const s of sectors) {
    console.log(`  - "${s.sector}": ${s.count} jobs`);
  }

  await sql.end();
}

verifyPurification().catch(console.error);
