import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL + '?sslmode=require', { max: 1 });

async function check() {
  const [res] = await sql`SELECT count(*)::int as count FROM jobs WHERE country_id = '28bd1d89-acc4-4142-a6f9-b06b5cfa8435'`;
  console.log(`Current genuine TZ jobs in database: ${res.count}`);
  await sql.end();
}

check();
