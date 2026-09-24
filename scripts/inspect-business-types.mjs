import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false });

async function check() {
  const types = await sql`SELECT * FROM business_types`;
  console.log('Business Types in DB:');
  for (const t of types) {
    console.log(JSON.stringify(t));
  }
  await sql.end();
}
check();
