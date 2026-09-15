import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
import * as fs from 'fs';

const sql = postgres(process.env.DATABASE_URL + '?sslmode=require', { max: 10 });

async function seedJobs() {
  console.log('Seeding jobs...');
  const data = JSON.parse(fs.readFileSync('dataset_jobs.json', 'utf8'));
  console.log(`Loaded ${data.length} jobs from JSON.`);

  const countryRes = await sql`SELECT id FROM countries WHERE code = 'KE' LIMIT 1`;
  const countryId = countryRes.length > 0 ? countryRes[0].id : null;

  if (!countryId) {
    console.error('No country found.');
    process.exit(1);
  }

  const batchSize = 1000;
  let inserted = 0;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize).map((j: any) => {
      
      const titleLower = j.title.toLowerCase();
      let sector = 'General Corporate';
      let profession = 'Professional';
      let exp = 'mid';
      
      if (titleLower.includes('software') || titleLower.includes('developer') || titleLower.includes('engineer') || titleLower.includes('data')) { sector = 'Technology'; profession = 'Software Engineer'; }
      else if (titleLower.includes('sales') || titleLower.includes('account executive')) { sector = 'Sales'; profession = 'Sales Professional'; }
      else if (titleLower.includes('market')) { sector = 'Marketing'; profession = 'Marketing Professional'; }
      else if (titleLower.includes('manag') || titleLower.includes('director') || titleLower.includes('head')) { sector = 'Management'; profession = 'Manager'; }
      
      if (titleLower.includes('senior') || titleLower.includes('sr') || titleLower.includes('lead') || titleLower.includes('principal')) exp = 'senior';
      else if (titleLower.includes('junior') || titleLower.includes('jr') || titleLower.includes('entry') || titleLower.includes('intern')) exp = 'entry';
      else if (titleLower.includes('director') || titleLower.includes('vp') || titleLower.includes('chief')) exp = 'executive';

      let jobType = 'full_time';
      if (j.job_type.toLowerCase().includes('contract')) jobType = 'contract';
      else if (j.job_type.toLowerCase().includes('part')) jobType = 'part_time';

      let reqs = j.description.substring(0, 500); // We take first 500 as requirements if not explicit
      let skillsArr = j.skills ? j.skills.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0).slice(0, 10) : [];
      if (skillsArr.length === 0) {
          skillsArr = ['Communication', 'Teamwork', 'Problem Solving'];
      }

      return {
        title: j.title.substring(0, 255),
        company_name: j.company_name.substring(0, 255) || 'Confidential Company',
        description: j.description || 'Detailed job description is available on the original posting site.',
        source_url: j.source_url || `https://linkedin.com/jobs/view/${Math.random().toString(36).substring(7)}`,
        job_type: jobType,
        is_active: true,
        country_id: countryId,
        sector,
        profession,
        experience_level: exp,
        education_level: "Bachelor's Degree",
        requirements: reqs || 'Relevant professional experience required.',
        skills: skillsArr,
        needs_ai_extraction: false
      };
    });

    try {
      await sql`INSERT INTO jobs ${sql(batch)} ON CONFLICT DO NOTHING`;
      inserted += batch.length;
      console.log(`Inserted batch ${i / batchSize + 1}... (${inserted} total)`);
    } catch (e: any) {
      console.error(`Batch ${i / batchSize + 1} failed:`, e.message);
    }
  }

  console.log(`✅ Finished seeding jobs. Inserted ~${inserted} rows.`);
}

seedJobs().then(() => process.exit(0)).catch(console.error);
