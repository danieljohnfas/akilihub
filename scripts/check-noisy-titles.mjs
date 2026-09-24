import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false });

async function checkNoisy() {
  const noisy = await sql`
    SELECT id, title, country_id, source_url
    FROM compliance_requirements
    WHERE title LIKE '[LINK]%' OR title LIKE 'http%'
    LIMIT 20
  `;
  console.log('Sample noisy titles:');
  for (const n of noisy) {
    console.log(JSON.stringify(n));
  }
  await sql.end();
}

checkNoisy();
