import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false, idle_timeout: 60, connect_timeout: 60 });

async function check() {
  const all = await sql`
    SELECT 
      ss.id, ss.job_title, ss.country_id, ss.currency, 
      ss.gross_monthly_salary, ss.net_monthly_salary, 
      ss.years_of_experience, ss.is_verified, ss.created_at,
      c.name as country_name
    FROM salary_submissions ss
    LEFT JOIN countries c ON ss.country_id = c.id
    ORDER BY ss.is_verified, ss.created_at DESC
    LIMIT 50
  `;
  console.log('=== SALARY SUBMISSIONS ===');
  console.log('Total shown:', all.length);
  for (const row of all) {
    console.log(JSON.stringify({
      title: row.job_title,
      country: row.country_name,
      currency: row.currency,
      gross: row.gross_monthly_salary,
      net: row.net_monthly_salary,
      yoe: row.years_of_experience,
      verified: row.is_verified
    }));
  }
  await sql.end();
}

check();
