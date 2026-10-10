import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function checkDomains() {
  const domains = await sql`
    SELECT split_part(split_part(source_url, '://', 2), '/', 1) as domain, COUNT(*) 
    FROM jobs 
    WHERE is_active = true 
    GROUP BY domain 
    ORDER BY COUNT(*) DESC
    LIMIT 20
  `;
  console.log(domains);
  await sql.end();
}
checkDomains();
