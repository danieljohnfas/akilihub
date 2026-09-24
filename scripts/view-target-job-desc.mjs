import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false });

async function viewDesc() {
  const [j] = await sql`SELECT description FROM jobs WHERE id = '32650c55-2340-4708-8523-8bfac67a0f66'`;
  console.log('=== DESCRIPTION ===');
  console.log(j.description);
  await sql.end();
}
viewDesc();
