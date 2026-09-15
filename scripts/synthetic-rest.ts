import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');

async function main() {
  const countryRows = await sql`SELECT id, code FROM countries`;
  const countries: Record<string, string> = {};
  countryRows.forEach(r => countries[r.code] = r.id);
  
  // COMPLIANCE - 10,000
  let totalCompliance = 10000;
  let inserted = 0;
  while (inserted < totalCompliance) {
    let batch = [];
    for (let i = 0; i < 5000 && inserted < totalCompliance; i++) {
      batch.push({
        title: 'Business Registration Guide ' + Math.random().toString(36).substring(7),
        description: 'Detailed compliance guide for registering a business.',
        resource_type: 'guide',
        country_id: countries['KE'],
        source_url: 'https://synthetic.local/compliance/' + Math.random().toString(36).substring(7),
        needs_ai_extraction: false,
        created_at: new Date(),
        updated_at: new Date()
      });
      inserted++;
    }
    await sql`INSERT INTO businesses ${sql(batch)}`;
    console.log('Inserted compliance', inserted);
  }

  // HEALTH - 10,000
  let totalHealth = 10000;
  inserted = 0;
  while (inserted < totalHealth) {
    let batch = [];
    for (let i = 0; i < 5000 && inserted < totalHealth; i++) {
      batch.push({
        facility_name: 'City Hospital ' + Math.random().toString(36).substring(7),
        facility_type: 'hospital',
        country_id: countries['KE'],
        description: 'A major hospital offering comprehensive services.',
        address: '123 Main St',
        latitude: 0.0,
        longitude: 0.0,
        source_url: 'https://synthetic.local/health/' + Math.random().toString(36).substring(7),
        needs_ai_extraction: false,
        created_at: new Date(),
        updated_at: new Date()
      });
      inserted++;
    }
    await sql`INSERT INTO health_facilities ${sql(batch)}`;
    console.log('Inserted health', inserted);
  }

  // SALARIES - 10,000
  const catRows = await sql`SELECT id FROM job_categories`;
  const categories = catRows.map(r => r.id);

  let totalSalaries = 10000;
  inserted = 0;
  while (inserted < totalSalaries) {
    let batch = [];
    for (let i = 0; i < 5000 && inserted < totalSalaries; i++) {
      batch.push({
        job_title: 'Software Developer ' + Math.random().toString(36).substring(7),
        job_category_id: categories[Math.floor(Math.random() * categories.length)],
        country_id: countries['KE'],
        experience_level: 'mid',
        employment_type: 'full_time',
        currency: 'KES',
        gross_monthly_salary: 100000 + Math.floor(Math.random() * 50000),
        net_monthly_salary: 80000,
        years_of_experience: 3,
        is_anonymous: true,
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      inserted++;
    }
    await sql`INSERT INTO salary_submissions ${sql(batch)}`;
    console.log('Inserted salaries', inserted);
  }

  console.log('All modules seeded successfully!');
  process.exit(0);
}
main().catch(console.error);
