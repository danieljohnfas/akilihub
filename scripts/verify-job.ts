import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import postgres from 'postgres';

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const conn = postgres(dbUrl, { ssl: 'require' });

async function check() {
  const r = await conn`
    SELECT id, title, company_name, source_url, employer_url, is_aggregator_source
    FROM jobs
    WHERE id = 'cdd94c9d-8a66-4662-9cdf-64afca5fe667';
  `;
  console.log('Verification of user reported job in DB:');
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
}

check();
