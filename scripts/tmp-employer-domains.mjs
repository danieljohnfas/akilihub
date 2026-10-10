import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function getDomains() {
  const domains = await sql`
    SELECT split_part(split_part(employer_url, '://', 2), '/', 1) as domain, COUNT(*) 
    FROM jobs 
    WHERE is_active = true AND employer_url IS NOT NULL
    GROUP BY domain 
    ORDER BY COUNT(*) DESC
  `;
  console.log(`Found ${domains.length} unique domains in employer_url.`);
  console.log(domains.slice(0, 50));
  await sql.end();
}
getDomains();
