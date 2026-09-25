import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false });

async function cleanRemaining() {
  const r = await sql`
    UPDATE jobs 
    SET description = REPLACE(description, 'adsbygoogle', ''),
        requirements = REPLACE(requirements, 'adsbygoogle', ''),
        updated_at = NOW()
    WHERE description LIKE '%adsbygoogle%' OR requirements LIKE '%adsbygoogle%'
    RETURNING id
  `;
  console.log(`Cleaned remaining ${r.length} jobs with adsbygoogle.`);

  const [after] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE description LIKE '%adsbygoogle%' OR requirements LIKE '%adsbygoogle%'`;
  console.log(`Final jobs with adsbygoogle: ${after.count} (Must be 0)`);
  await sql.end();
}
cleanRemaining();
