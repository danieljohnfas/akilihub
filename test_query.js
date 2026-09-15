const postgres = require('postgres');
const { drizzle } = require('drizzle-orm/postgres-js');
const { count, eq, and, isNull, gt, or } = require('drizzle-orm');
const sql = postgres('postgresql://postgres.pywienffahvmylssnorr:6g3kJKx9u%40Sb!Xn@aws-1-eu-central-1.pooler.supabase.com:6543/postgres', { ssl: 'require' });
const db = drizzle(sql);
async function run() {
  try {
    const res = await sql\SELECT COUNT(*) FROM jobs WHERE is_active = true AND (deadline IS NULL OR deadline > NOW())\;
    console.log('Raw SQL count:', res);
  } catch (e) { console.error('Raw SQL error:', e); }
  process.exit(0);
}
run();
