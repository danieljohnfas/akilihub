import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false });

async function testRegex() {
  const [testY] = await sql`SELECT COUNT(*)::int as count FROM tenders WHERE title ~* '\\y(medical|health|hospital|drugs?)\\y'`;
  const [testB] = await sql`SELECT COUNT(*)::int as count FROM tenders WHERE title ~* '\\b(medical|health|hospital|drugs?)\\b'`;
  const [testSimple] = await sql`SELECT COUNT(*)::int as count FROM tenders WHERE title ~* '(medical|health|hospital|drugs?)'`;

  console.log('Match with \\y:    ', testY.count);
  console.log('Match with \\b:    ', testB.count);
  console.log('Match with simple: ', testSimple.count);

  await sql.end();
}

testRegex();
