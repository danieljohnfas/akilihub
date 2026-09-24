import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  max: 1,
  prepare: false,
  idle_timeout: 30,
  connect_timeout: 30,
});

const { TypeSafeClient, score, noul, choice } = require('@typesafe-ai/sdk');

const jev = new TypeSafeClient({
  apiKey: process.env.TYPESAFE_API_KEY.trim(),
});

async function verifyJobWithJev(jobId) {
  console.log(`=== JEV DATA STANDARDS VERIFICATION ===`);
  console.log(`Job ID: ${jobId}`);
  console.log(`URL: https://akilibrain.com/jobs/${jobId}\n`);

  const [job] = await sql`
    SELECT j.*, c.name as country_name, r.name as region_name
    FROM jobs j
    LEFT JOIN countries c ON j.country_id = c.id
    LEFT JOIN regions r ON j.region_id = r.id
    WHERE j.id = ${jobId}
  `;

  if (!job) {
    console.error(`Job ${jobId} not found.`);
    await sql.end();
    return;
  }

  console.log('--- CURRENT DATABASE VALUES ---');
  console.log('Title:            ', job.title);
  console.log('Company:          ', job.company_name);
  console.log('Sector:           ', job.sector);
  console.log('Profession:       ', job.profession);
  console.log('Country/Location: ', `${job.location || ''} (${job.country_name || ''})`);
  console.log('Skills:           ', job.skills);
  console.log('Employer URL:     ', job.employer_url);
  console.log('Source URL:       ', job.source_url);
  console.log('Deadline:         ', job.deadline);
  console.log('Has AdSense:      ', (job.description || '').includes('adsbygoogle'));
  console.log('Has mailto:       ', (job.employer_url || '').startsWith('mailto:'));
  console.log('-------------------------------\n');

  const state = `
JOB RECORD FOR AUDIT:
Title: ${job.title}
Company Name: ${job.company_name}
Country: ${job.country_name || 'N/A'}
Location: ${job.location || 'N/A'}
Assigned Sector: ${job.sector || 'N/A'}
Assigned Profession: ${job.profession || 'N/A'}
Experience Level: ${job.experience_level || 'N/A'}
Education Level: ${job.education_level || 'N/A'}
Tagged Skills: ${Array.isArray(job.skills) ? job.skills.join(', ') : 'None'}
Employer URL: ${job.employer_url || 'None'}
Source URL: ${job.source_url || 'None'}
Deadline: ${job.deadline ? job.deadline.toISOString() : 'None'}
Active Status: ${job.is_active}

Requirements:
${(job.requirements || 'NONE').substring(0, 1500)}

Description Sample:
${(job.description || 'NONE').substring(0, 1500)}
`.trim();

  console.log('Evaluating with Jev System One...\n');

  const result = await jev.systemOne({
    state,
    questions: {
      sectorAccuracy: score('How accurately does the assigned sector match the actual job content (farming, agriculture, cooperatives)?', [
        'Completely wrong: An IT/software sector was assigned to an agricultural/field/cooperative role',
        'Poor match: Significant mismatch between assigned sector and job duties',
        'Moderate match: Related but not the primary domain',
        'Accurate match: Sector properly reflects agriculture or community development',
      ]),
      companyAccuracy: score('Is the company name accurate, specific, and real rather than generic placeholder?', [
        'Generic placeholder like "Verified Employer Rwanda" when the actual organization (e.g. RDO / Rwanda Development Organization) is stated in the description',
        'Vague or incomplete company identification',
        'Acceptable company identification',
        'Exact and verified organization name',
      ]),
      urlCleanliness: score('Is the employer URL a proper, valid web URL rather than a mailto scheme or raw email?', [
        'Broken format: Contains mailto: link or raw email in a URL field',
        'Dubious or aggregator redirect',
        'Valid web link to job page or organization',
        'Clean official organization website or application portal',
      ]),
      contentCleanliness: score('Is the description free from raw ad code (adsbygoogle), scraper newsletter popups, or crawler junk?', [
        'Polluted: Contains raw AdSense script calls, "Click Here to Subscribe", or scraper boilerplate',
        'Partially cleaned but remnants of scraper text remain',
        'Clean: Standard job posting format without ad code or scraper junk',
        'Pristine: Cleanly structured markdown/HTML with no artifacts',
      ]),
      overallCompliance: noul(
        'Does this listing strictly adhere to professional data standards without requiring data cleaning or re-classification?',
        {
          true: 'Yes, it meets professional standards and needs no corrections',
          false: 'No, it requires corrections (wrong sector, placeholder company, mailto link, or ad boilerplate)',
        }
      ),
      verdict: choice('What is the overall verdict on this listing?', {
        non_compliant: 'Fails standards: Incorrect sector (IT vs Agriculture), generic company name, mailto in URL field, or scraper boilerplate present',
        partially_compliant: 'Minor issues only, generally usable but imperfect',
        fully_compliant: 'Fully compliant with gold data standards',
      }),
      correctSector: choice('What is the correct sector for this role?', {
        agriculture: 'Agriculture, Farming, Agribusiness & Cooperatives',
        ngo_development: 'Non-Governmental Organisation (NGO) & Community Development',
        it_software: 'Information Technology & Software',
        general_business: 'General Business & Administration',
      }),
    },
  });

  console.log('=== JEV SYSTEM ONE EVALUATION RESULTS ===');
  console.log(`Sector Accuracy Score:    ${result.answers.sectorAccuracy.score.toFixed(2)} / 3.0`);
  console.log(`Company Accuracy Score:   ${result.answers.companyAccuracy.score.toFixed(2)} / 3.0`);
  console.log(`URL Cleanliness Score:     ${result.answers.urlCleanliness.score.toFixed(2)} / 3.0`);
  console.log(`Content Cleanliness Score: ${result.answers.contentCleanliness.score.toFixed(2)} / 3.0`);
  console.log(`Strict Compliance:        ${(result.answers.overallCompliance.noul * 100).toFixed(1)}%`);
  console.log(`Jev Overall Verdict:      ${result.answers.verdict.choice}`);
  console.log(`Jev Recommended Sector:   ${result.answers.correctSector.choice}`);
  console.log('=========================================\n');

  await sql.end();
  return { job, result };
}

const TARGET_JOB_ID = '32650c55-2340-4708-8523-8bfac67a0f66';
verifyJobWithJev(TARGET_JOB_ID).catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
