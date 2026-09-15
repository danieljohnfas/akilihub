const { Pool } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.remote' });

async function purge() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const res = await pool.query("DELETE FROM jobs WHERE company_name = 'Unknown'");
  console.log('Purged ' + res.rowCount + ' non-standard jobs.');
  await pool.end();
}
purge();
