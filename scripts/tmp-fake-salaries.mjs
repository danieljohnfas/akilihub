import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function findFakeSalaries() {
  const fake = await sql`
    SELECT id, title, company_name, source_url 
    FROM jobs 
    WHERE is_active = true 
    AND (
      description ILIKE '%$75,000%'
      OR description ILIKE '%posho za chakula%'
      OR description ILIKE '%$110,000%'
      OR description ILIKE '%$50,000 - $90,000%'
      OR description ILIKE '%Pakiti yetu ya%'
    )
  `;
  console.log("Fake Salaries:", fake);
  await sql.end();
}
findFakeSalaries();
