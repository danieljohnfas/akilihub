import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false });

async function run() {
  const employers = await sql`SELECT * FROM employers`;
  console.log('EMPLOYERS:');
  for (const e of employers) {
    console.log(JSON.stringify(e));
  }

  const guides = await sql`SELECT id, slug, title, summary, keywords, reading_time_minutes FROM guides WHERE keywords IS NULL OR TRIM(keywords) = ''`;
  console.log('\nGUIDES WITHOUT KEYWORDS:');
  for (const g of guides) {
    console.log(JSON.stringify(g));
  }

  await sql.end();
}

run();
