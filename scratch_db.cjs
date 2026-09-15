const postgres = require('postgres');
const sql = postgres('postgresql://postgres.pywienffahvmylssnorr:6g3kJKx9u%40Sb!Xn@aws-1-eu-central-1.pooler.supabase.com:6543/postgres', { ssl: 'require' });
async function check() {
  try {
    const jobs = await sql\SELECT COUNT(*) FROM jobs\;
    const tenders = await sql\SELECT COUNT(*) FROM tenders\;
    console.log('Jobs count:', jobs[0].count);
    console.log('Tenders count:', tenders[0].count);
  } catch (e) {
    console.error('DB Error:', e.message);
  } finally {
    await sql.end();
  }
}
check();
