import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false });

async function run() {
  const [noisyTitles] = await sql`SELECT COUNT(*)::int as count FROM compliance_requirements WHERE title LIKE '[LINK]%' OR title LIKE 'http%'`;
  console.log(`Noisy titles starting with [LINK] or URL: ${noisyTitles.count}`);

  const categories = await sql`SELECT category, COUNT(*)::int as count FROM compliance_requirements GROUP BY category`;
  console.log('Categories:', categories);

  const authorities = await sql`SELECT issuing_authority, COUNT(*)::int as count FROM compliance_requirements GROUP BY issuing_authority ORDER BY count DESC LIMIT 15`;
  console.log('Top authorities:', authorities);

  await sql.end();
}

run();
