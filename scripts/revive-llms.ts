import postgres from 'postgres';
import { config } from 'dotenv';
config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL! + '?sslmode=require', { max: 1 });

async function reviewAndReviveLLMs() {
  console.log('--- Current LLM Status ---');
  const telemetry = await sql`SELECT * FROM ai_telemetry ORDER BY error_count DESC;`;
  
  if (telemetry.length === 0) {
    console.log('No LLMs found in telemetry table.');
  } else {
    for (const row of telemetry) {
      console.log(`- ${row.id}: ${row.error_count} errors, Cooled until: ${new Date(Number(row.cool_until)).toLocaleString()}, Total Calls: ${row.total_calls}`);
    }
  }

  console.log('\n--- Reviving All LLMs ---');
  await sql`UPDATE ai_telemetry SET cool_until = 0, error_count = 0;`;
  console.log('✅ All LLM cooldowns and error counts have been reset to 0.');
  
  process.exit(0);
}

reviewAndReviveLLMs().catch(err => {
  console.error(err);
  process.exit(1);
});
