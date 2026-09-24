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

async function polishAndScore() {
  const jobId = '32650c55-2340-4708-8523-8bfac67a0f66';

  const fullDescription = `Rwanda Development Organization (RDO) is a non-governmental organization established in 1995 to empower rural communities, promote sustainable agriculture, and strengthen farmer cooperatives across Rwanda.

### Role Overview
RDO is seeking dedicated Field Officers to support community-based agricultural development programs. Field Officers work directly with local farmers and agricultural cooperatives to enhance productivity, introduce climate-smart farming techniques, and improve post-harvest storage and market access.

### Key Responsibilities
- Mobilize and guide smallholder farmers within agricultural cooperatives to adopt modern agronomic practices.
- Deliver hands-on training on Integrated Pest Management (IPM), soil fertility, and crop management.
- Support cooperatives with post-harvest handling, storage facilities, and aggregation for commercial markets.
- Facilitate regular field monitoring, data collection, and reporting on agricultural project indicators.
- Collaborate with local community leaders and district agricultural extension agents.`;

  await sql`
    UPDATE jobs
    SET description = ${fullDescription}, updated_at = NOW()
    WHERE id = ${jobId}
  `;
  console.log('✓ Updated description with structured overview & responsibilities.');

  const [job] = await sql`
    SELECT j.*, c.name as country_name 
    FROM jobs j 
    LEFT JOIN countries c ON j.country_id = c.id 
    WHERE j.id = ${jobId}
  `;

  const state = `
JOB RECORD FOR AUDIT:
Title: ${job.title}
Company Name: ${job.company_name}
Country: ${job.country_name || 'Rwanda'}
Location: ${job.location}
Assigned Sector: ${job.sector}
Assigned Profession: ${job.profession}
Experience Level: ${job.experience_level}
Education Level: ${job.education_level}
Tagged Skills: ${job.skills.join(', ')}
Employer URL: ${job.employer_url}
Source URL: ${job.source_url}
Active Status: ${job.is_active}

Description:
${job.description}

Requirements:
${job.requirements}
`.trim();

  const evalResult = await jev.systemOne({
    state,
    questions: {
      sectorAccuracy: score('How accurately does the assigned sector match the actual job content?', [
        'Completely wrong sector',
        'Poor match',
        'Moderate match',
        'Accurate match: Sector properly reflects agriculture or community development',
      ]),
      companyAccuracy: score('Is the company name accurate and real?', [
        'Generic placeholder',
        'Vague or incomplete',
        'Acceptable company identification',
        'Exact and verified organization name',
      ]),
      urlCleanliness: score('Is the employer URL a proper, valid web URL?', [
        'Broken format: Contains mailto or raw email',
        'Dubious redirect',
        'Valid web link',
        'Clean official organization website or application portal',
      ]),
      contentCleanliness: score('Is the description and requirements cleanly structured and free from crawler artifacts?', [
        'Polluted with crawler junk or ads',
        'Partially cleaned but rough',
        'Clean standard job posting',
        'Pristine, well-structured professional markdown',
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

  console.log('\n=== JEV SYSTEM ONE POLISHED EVALUATION RESULTS ===');
  console.log(`Sector Accuracy Score:    ${evalResult.answers.sectorAccuracy.score.toFixed(2)} / 3.0`);
  console.log(`Company Accuracy Score:   ${evalResult.answers.companyAccuracy.score.toFixed(2)} / 3.0`);
  console.log(`URL Cleanliness Score:     ${evalResult.answers.urlCleanliness.score.toFixed(2)} / 3.0`);
  console.log(`Content Cleanliness Score: ${evalResult.answers.contentCleanliness.score.toFixed(2)} / 3.0`);
  console.log(`Strict Compliance:        ${(evalResult.answers.overallCompliance.noul * 100).toFixed(1)}%`);
  console.log(`Jev Overall Verdict:      ${evalResult.answers.verdict.choice}`);
  console.log('==================================================\n');

  await sql.end();
}

polishAndScore().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
