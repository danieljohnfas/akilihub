const postgres = require('postgres');
const sql = postgres('postgresql://postgres.pywienffahvmylssnorr:6g3kJKx9u%40Sb!Xn@aws-1-eu-central-1.pooler.supabase.com:6543/postgres');

async function run() {
  const tables = await sql`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  `;
  
  if (tables.length === 0) {
    console.log('No tables found in the public schema.');
    process.exit(0);
  }

  console.log('--- Database Tables & Row Counts ---');
  let totalRows = 0;
  for (const table of tables) {
    const res = await sql.unsafe('SELECT COUNT(*) FROM "' + table.tablename + '"');
    const count = parseInt(res[0].count);
    totalRows += count;
    console.log(table.tablename.padEnd(30, ' ') + ': ' + count + ' rows');
  }
  console.log('------------------------------------');
  console.log('Total Records'.padEnd(30, ' ') + ': ' + totalRows + ' rows');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
