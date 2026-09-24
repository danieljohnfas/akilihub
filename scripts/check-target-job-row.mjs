import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false });

async function checkRow() {
  const [j] = await sql`
    SELECT id, title, company_name, sector, profession, employer_url, length(description) as d_len, length(requirements) as r_len, substring(description from 1 for 200) as d_preview
    FROM jobs 
    WHERE id = '32650c55-2340-4708-8523-8bfac67a0f66'
  `;
  console.log(JSON.stringify(j, null, 2));
  await sql.end();
}
checkRow();
