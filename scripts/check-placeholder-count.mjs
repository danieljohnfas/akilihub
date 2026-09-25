import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false });

async function check() {
  const [p] = await sql`
    SELECT COUNT(*)::int as count 
    FROM jobs 
    WHERE company_name ILIKE '%verified employer%' 
       OR company_name ILIKE '%tanzanian employer%' 
       OR company_name ILIKE '%anonymous employer%'
  `;
  console.log('Current placeholder companies remaining:', p.count);
  await sql.end();
}
check();
