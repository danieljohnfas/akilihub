import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false });

async function check() {
  const [short] = await sql`
    SELECT COUNT(*)::int as count 
    FROM jobs 
    WHERE is_active = true AND (requirements IS NULL OR LENGTH(TRIM(requirements)) < 50)
  `;
  const [cf] = await sql`
    SELECT COUNT(*)::int as count 
    FROM jobs 
    WHERE is_active = true AND (description LIKE '%[email protected]%' OR requirements LIKE '%[email protected]%')
  `;
  console.log('Jobs with short/missing reqs:', short.count);
  console.log('Jobs with [email protected]:  ', cf.count);
  await sql.end();
}
check();
