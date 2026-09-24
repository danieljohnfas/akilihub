import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false });

async function check() {
  const [updatedCount] = await sql`
    SELECT COUNT(*)::int as count 
    FROM compliance_requirements 
    WHERE last_verified_at > NOW() - INTERVAL '15 minutes'
  `;
  console.log('Compliance requirements updated recently:', updatedCount.count);
  await sql.end();
}

check();
