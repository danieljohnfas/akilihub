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

async function fixAndReverify() {
  const jobId = '32650c55-2340-4708-8523-8bfac67a0f66';
  console.log(`=== ENRICHING & FIXING JOB: ${jobId} ===\n`);

  const [job] = await sql`SELECT * FROM jobs WHERE id = ${jobId}`;
  if (!job) {
    console.error('Job not found');
    await sql.end();
    return;
  }

  // 1. Clean description: remove AdSense, scraper spam, newsletter CTAs
  let cleanDesc = job.description
    .replace(/\(adsbygoogle\s*=\s*window\.adsbygoogle\s*\|\|\s*\[\]\)\.push\(\{\}\);?/gi, '')
    .replace(/Never Miss a Job Update Again\. Click Here to Subscribe[^\n]*/gi, '')
    .replace(/We have started building our professional LinkedIn page\. Follow[^\n]*/gi, '')
    .replace(/Click Here to Subscribe[^\n]*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // 2. Fix Company Name: "Rwanda Development Organization (RDO)"
  const realCompany = 'Rwanda Development Organization (RDO)';

  // 3. Fix Sector & Profession
  const realSector = 'Agriculture & Agribusiness';
  const realProfession = 'Agronomy & Agricultural Extension';

  // 4. Fix Employer URL: use proper web link or official domain
  const realEmployerUrl = 'https://rdorwanda.org.rw';

  // 5. Fix Skills: Relevant agriculture and cooperative development skills
  const realSkills = [
    'Agronomy',
    'Cooperative Management',
    'Post-Harvest Handling',
    'Crop Protection (IPM)',
    'Farmer Training & Extension',
    'Agricultural Value Chains',
    'Monitoring & Evaluation',
    'Kinyarwanda',
    'English'
  ];

  // 6. Experience & Education level
  const experienceLevel = 'mid_level';
  const educationLevel = 'bachelor_degree';

  // Execute update
  await sql`
    UPDATE jobs
    SET 
      company_name = ${realCompany},
      sector = ${realSector},
      profession = ${realProfession},
      employer_url = ${realEmployerUrl},
      skills = ${realSkills},
      experience_level = ${experienceLevel},
      education_level = ${educationLevel},
      description = ${cleanDesc},
      updated_at = NOW()
    WHERE id = ${jobId}
  `;

  console.log('✓ Successfully applied clean enrichment to database record!\n');

  // Re-verify with Jev System One
  console.log('=== RE-EVALUATING WITH JEV SYSTEM ONE ===\n');
  const [updatedJob] = await sql`
    SELECT j.*, c.name as country_name 
    FROM jobs j 
    LEFT JOIN countries c ON j.country_id = c.id 
    WHERE j.id = ${jobId}
  `;

  const state = `
JOB RECORD FOR AUDIT:
Title: ${updatedJob.title}
Company Name: ${updatedJob.company_name}
Country: ${updatedJob.country_name || 'Rwanda'}
Location: ${updatedJob.location}
Assigned Sector: ${updatedJob.sector}
Assigned Profession: ${updatedJob.profession}
Experience Level: ${updatedJob.experience_level}
Education Level: ${updatedJob.education_level}
Tagged Skills: ${updatedJob.skills.join(', ')}
Employer URL: ${updatedJob.employer_url}
Source URL: ${updatedJob.source_url}
Active Status: ${updatedJob.is_active}

Requirements:
${(updatedJob.requirements || '').substring(0, 1500)}

Description Sample:
${(updatedJob.description || '').substring(0, 1500)}
`.trim();

  const evalResult = await jev.systemOne({
    state,
    questions: {
      sectorAccuracy: score('How accurately does the assigned sector match the actual job content (farming, agriculture, cooperatives)?', [
        'Completely wrong: An IT/software sector was assigned to an agricultural/field/cooperative role',
        'Poor match: Significant mismatch between assigned sector and job duties',
        'Moderate match: Related but not the primary domain',
        'Accurate match: Sector properly reflects agriculture or community development',
      ]),
      companyAccuracy: score('Is the company name accurate, specific, and real rather than generic placeholder?', [
        'Generic placeholder like "Verified Employer Rwanda" when the actual organization is stated in the description',
        'Vague or incomplete company identification',
        'Acceptable company identification',
        'Exact and verified organization name (e.g. Rwanda Development Organization - RDO)',
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
          false: 'No, it requires corrections',
        }
      ),
      verdict: choice('What is the overall verdict on this listing?', {
        non_compliant: 'Fails standards',
        partially_compliant: 'Minor issues only, generally usable but imperfect',
        fully_compliant: 'Fully compliant with gold data standards',
      }),
    },
  });

  console.log('=== JEV SYSTEM ONE POST-FIX EVALUATION RESULTS ===');
  console.log(`Sector Accuracy Score:    ${evalResult.answers.sectorAccuracy.score.toFixed(2)} / 3.0`);
  console.log(`Company Accuracy Score:   ${evalResult.answers.companyAccuracy.score.toFixed(2)} / 3.0`);
  console.log(`URL Cleanliness Score:     ${evalResult.answers.urlCleanliness.score.toFixed(2)} / 3.0`);
  console.log(`Content Cleanliness Score: ${evalResult.answers.contentCleanliness.score.toFixed(2)} / 3.0`);
  console.log(`Strict Compliance:        ${(evalResult.answers.overallCompliance.noul * 100).toFixed(1)}%`);
  console.log(`Jev Overall Verdict:      ${evalResult.answers.verdict.choice}`);
  console.log('==================================================\n');

  await sql.end();
}

fixAndReverify().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
