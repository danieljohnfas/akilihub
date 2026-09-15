import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');

async function main() {
  const countryRows = await sql`SELECT id, code FROM countries`;
  const countries: Record<string, string> = {};
  countryRows.forEach(r => countries[r.code] = r.id);
  
  const catRows = await sql`SELECT id, name FROM job_categories`;
  const categories = catRows.map(r => r.id);
  
  let totalJobs = 30000;
  console.log('Inserting', totalJobs, 'jobs...');
  let inserted = 0;
  
  while (inserted < totalJobs) {
    let batch = [];
    for (let i = 0; i < 5000 && inserted < totalJobs; i++) {
      batch.push({
        title: 'Senior Professional ' + Math.random().toString(36).substring(7),
        company_name: 'Acme Corp ' + Math.random().toString(36).substring(7),
        description: 'Comprehensive description for a highly demanding professional role.\n\nRequirements:\n- 5 years experience\n- Strong communication skills\n- Bachelor degree',
        job_type: 'full_time',
        job_category_id: categories[Math.floor(Math.random() * categories.length)],
        country_id: countries['KE'],
        source_url: 'https://synthetic.local/' + Math.random().toString(36).substring(7),
        salary_min: 50000,
        salary_max: 150000,
        is_active: true,
        needs_ai_extraction: false,
        created_at: new Date(),
        updated_at: new Date()
      });
      inserted++;
    }
    // Bulk insert batch using postgres driver
    await sql`INSERT INTO jobs ${sql(batch)}`;
    console.log('Inserted', inserted);
  }
  
  console.log('Jobs Done!');
  
  // TENDERS - 10,000
  let totalTenders = 10000;
  inserted = 0;
  while (inserted < totalTenders) {
    let batch = [];
    for (let i = 0; i < 5000 && inserted < totalTenders; i++) {
      batch.push({
        title: 'Government Procurement ' + Math.random().toString(36).substring(7),
        organization_name: 'Ministry of Health',
        description: 'Supply of essential materials.',
        country_id: countries['KE'],
        source_url: 'https://synthetic.local/tender/' + Math.random().toString(36).substring(7),
        deadline: new Date(Date.now() + 86400000 * 30),
        status: 'open',
        needs_ai_extraction: false,
        created_at: new Date(),
        updated_at: new Date()
      });
      inserted++;
    }
    await sql`INSERT INTO tenders ${sql(batch)}`;
    console.log('Inserted tenders', inserted);
  }

  process.exit(0);
}

main().catch(console.error);
