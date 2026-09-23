import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));

const { TypeSafeClient, score, noul, choice } = require('@typesafe-ai/sdk');
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });
const client = new TypeSafeClient({ apiKey: process.env.TYPESAFE_API_KEY.trim() });

const JOB_ID = '4600b275-3a3f-4c6c-bdf0-846a1dac067c';

async function main() {
  console.log(`\nFetching job ${JOB_ID} from database...`);

  const rows = await sql`
    SELECT
      id, title, company_name, description, requirements, deadline,
      source_url, employer_url, is_aggregator_source, is_active,
      salary_min, salary_max, salary_currency, experience_level,
      education_level, skills, profession, sector, updated_at,
      country_id, job_type, region_id, location
    FROM jobs
    WHERE id = ${JOB_ID}
  `;

  if (!rows.length) {
    console.error('Job not found in database!');
    process.exit(1);
  }

  const job = rows[0];

  console.log('\n=== RAW DATABASE RECORD ===');
  console.log(`  title:              ${job.title}`);
  console.log(`  company_name:       ${job.company_name}`);
  console.log(`  source_url:         ${job.source_url}`);
  console.log(`  employer_url:       ${job.employer_url}`);
  console.log(`  is_aggregator:      ${job.is_aggregator_source}`);
  console.log(`  is_active:          ${job.is_active}`);
  console.log(`  deadline:           ${job.deadline}`);
  console.log(`  experience_level:   ${job.experience_level}`);
  console.log(`  education_level:    ${job.education_level}`);
  console.log(`  salary_min:         ${job.salary_min}`);
  console.log(`  salary_max:         ${job.salary_max}`);
  console.log(`  salary_currency:    ${job.salary_currency}`);
  console.log(`  profession:         ${job.profession}`);
  console.log(`  sector:             ${job.sector}`);
  console.log(`  country_id:         ${job.country_id}`);
  console.log(`  location:           ${job.location}`);
  console.log(`  job_type:           ${job.job_type}`);
  console.log(`  skills:             ${JSON.stringify(job.skills)}`);
  console.log(`  updated_at:         ${job.updated_at}`);
  console.log(`  description chars:  ${(job.description || '').length}`);
  console.log(`  requirements chars: ${(job.requirements || '').length}`);
  console.log(`\nDescription preview:\n${(job.description || '(empty)').substring(0, 400)}`);
  console.log(`\nRequirements preview:\n${(job.requirements || '(empty)').substring(0, 400)}`);

  // Build state text for Jev review
  const stateText = `
JOB LISTING RECORD — AkiliHub Database
=======================================
Title: ${job.title}
Company: ${job.company_name || '(MISSING)'}
Source URL: ${job.source_url || '(MISSING)'}
Employer URL: ${job.employer_url || '(MISSING)'}
Is Aggregator: ${job.is_aggregator_source}
Is Active: ${job.is_active}
Deadline: ${job.deadline || '(MISSING)'}
Country ID: ${job.country_id || '(MISSING)'}
Location: ${job.location || '(MISSING)'}
Job Type: ${job.job_type || '(MISSING)'}
Experience Level: ${job.experience_level || '(MISSING)'}
Education Level: ${job.education_level || '(MISSING)'}
Salary Min: ${job.salary_min || '(MISSING)'}
Salary Currency: ${job.salary_currency || '(MISSING)'}
Profession: ${job.profession || '(MISSING)'}
Sector: ${job.sector || '(MISSING)'}
Skills: ${job.skills?.length ? job.skills.join(', ') : '(MISSING)'}

Description (${(job.description || '').length} chars):
${(job.description || '(EMPTY)').substring(0, 800)}

Requirements (${(job.requirements || '').length} chars):
${(job.requirements || '(EMPTY)').substring(0, 600)}
`.trim();

  console.log('\n\n=== JEV SYSTEM ONE EVALUATION ===');

  const result = await client.systemOne(
    {
      state: stateText,
      questions: {
        dataCompleteness: score(
          'Score how complete and well-enriched this job record is (0=Critically incomplete, 1=Shallow/missing key fields, 2=Adequate, 3=Fully enriched):',
          [
            'Critically incomplete: missing company name, description, or source URL — essentially empty or broken',
            'Shallow: has title and basic description but missing requirements, deadline, skills, employer_url, or sector',
            'Adequate: has description, requirements, employer URL resolved, some skills and sector filled in',
            'Fully enriched: rich description, structured requirements, deadline set, skills array populated, sector/profession set, employer URL resolved, is_aggregator correctly flagged',
          ]
        ),
        companyNameCorrect: noul(
          'Is the company name a real, specific employer name (not "TRA", null, "Unknown", or a generic scraper artifact)?',
          { true: 'Yes, it is a real identifiable employer name', false: 'No, it is missing, null, "TRA", "Unknown", or clearly wrong' }
        ),
        sourceUrlDirect: noul(
          'Does the source_url point directly to the employer or a legitimate ATS (not an aggregator like brightermonday, jobweb, fuzu, myjobmag, ajira, linkedin)?',
          { true: 'Yes, the source URL is a direct employer or ATS URL', false: 'No, it points to a job aggregator or is missing' }
        ),
        requirementsStructured: noul(
          'Does the requirements field contain meaningful, structured content (bullet points or sentences listing qualifications, skills, or experience)?',
          { true: 'Yes, requirements are clear and structured', false: 'No, requirements are empty, generic, or less than 2 sentences' }
        ),
        needsMoreWork: noul(
          'Does this record still need further data enrichment or corrections before being shown to job seekers?',
          { true: 'Yes, it still needs enrichment — missing fields, wrong company, aggregator URL, or empty requirements', false: 'No, this record is sufficiently enriched and accurate' }
        ),
        primaryGap: choice(
          'What is the single most important missing or incorrect field in this record?',
          {
            company_name: 'Company name is wrong, null, or a scraper artifact',
            employer_url: 'Employer URL is missing or still points to an aggregator',
            requirements: 'Requirements field is empty or too short to be useful',
            deadline: 'Deadline is missing — job seekers cannot tell if it is still open',
            skills_sector: 'Skills array or sector/profession classification is empty',
            description_quality: 'Description is too short, generic, or filled with boilerplate',
            all_good: 'No significant gaps — record is well-enriched',
          }
        ),
      },
    },
    { timeout: 15_000 }
  );

  const a = result.answers;
  const compScore = a.dataCompleteness?.score ?? 0;
  const levels = ['Critically incomplete', 'Shallow', 'Adequate', 'Fully enriched'];
  const level = levels[Math.round(compScore)] || 'Shallow';

  console.log(`\nJev Results for Job ${JOB_ID}:`);
  console.log(`  Data Completeness:     ${compScore.toFixed(2)}/3.0 (${level})`);
  console.log(`  Company Name Correct:  ${(a.companyNameCorrect?.noul * 100).toFixed(0)}%`);
  console.log(`  Source URL Direct:     ${(a.sourceUrlDirect?.noul * 100).toFixed(0)}%`);
  console.log(`  Requirements Struct.:  ${(a.requirementsStructured?.noul * 100).toFixed(0)}%`);
  console.log(`  Needs More Work:       ${(a.needsMoreWork?.noul * 100).toFixed(0)}%`);
  console.log(`  Primary Gap:           ${a.primaryGap?.choice}`);

  if (a.needsMoreWork?.noul >= 0.5) {
    console.log(`\n⚠️  This record STILL NEEDS ENRICHMENT.`);
    console.log(`   Primary gap to fix: ${a.primaryGap?.choice}`);
  } else {
    console.log(`\n✅ Jev considers this record sufficiently enriched.`);
  }

  await sql.end();
}

main().catch(async (err) => {
  console.error(err);
  await sql.end();
  process.exit(1);
});
