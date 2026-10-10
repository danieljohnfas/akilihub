import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function explore() {
  console.log("=== HEALTH INDICATORS ===");
  const h1 = await sql`SELECT * FROM health_indicators LIMIT 2`;
  console.log(h1);
  
  console.log("\n=== HEALTH DATA POINTS ===");
  const h2 = await sql`SELECT * FROM health_data_points LIMIT 2`;
  console.log(h2);
  
  console.log("\n=== SALARY SUBMISSIONS ===");
  const s1 = await sql`SELECT * FROM salary_submissions LIMIT 2`;
  console.log(s1);

  await sql.end();
}
explore();
