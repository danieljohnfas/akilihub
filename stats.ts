import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL as string, { ssl: 'require' });

async function getStats() {
  const tables = [
    { name: 'tenders', createdCol: 'created_at', updatedCol: 'updated_at' },
    { name: 'compliance_requirements', createdCol: 'created_at', updatedCol: 'updated_at' },
    { name: 'jobs', createdCol: 'created_at', updatedCol: 'updated_at' },
    { name: 'salary_submissions', createdCol: 'submitted_at', updatedCol: 'submitted_at' },
    { name: 'guides', createdCol: 'published_at', updatedCol: 'updated_at' },
    { name: 'health_indicators', createdCol: 'created_at', updatedCol: 'created_at' },
    { name: 'health_data_points', createdCol: 'created_at', updatedCol: 'created_at' },
    { name: 'user_documents', createdCol: 'created_at', updatedCol: 'created_at' }
  ];

  console.log('--- Database Stats ---');
  for (const table of tables) {
    try {
      const result = await sql`
        SELECT 
          count(*) as total, 
          max(${sql(table.createdCol)}) as last_created,
          max(${sql(table.updatedCol)}) as last_updated
        FROM ${sql(table.name)}
      `;
      const stats = result[0];
      console.log(`${table.name.padEnd(25)} | Total: ${stats.total.toString().padEnd(6)} | Last Inserted: ${stats.last_created} | Last Updated: ${stats.last_updated}`);
    } catch (e: any) {
      console.log(`${table.name.padEnd(25)} | Error: ${e.message}`);
    }
  }
  process.exit(0);
}

getStats();
