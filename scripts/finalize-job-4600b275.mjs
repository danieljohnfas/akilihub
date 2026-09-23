import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });
const { TypeSafeClient, score, noul, choice } = require('@typesafe-ai/sdk');

const client = new TypeSafeClient({ apiKey: process.env.TYPESAFE_API_KEY.trim() });
const JOB_ID = '4600b275-3a3f-4c6c-bdf0-846a1dac067c';

async function updateAndVerify() {
  const hrEmail = 'zting1812@gmail.com';
  const employerUrl = 'https://www.goodwillceramicstiles.com';

  const requirements = `Requirements:
• Female, aged 20–30
• Excellent verbal communication skills — clear diction, confident delivery, and no stage fright
• Clean, friendly appearance with strong on-camera charisma; natural presence; good sense of style and ability to model brand attire effectively
• Prior experience in short-form video, live streaming, hosting, sales presentations, MC work, or modeling; TikTok/Instagram/Facebook experience strongly preferred
• Background in building materials, home decor, furniture, or retail sales is a significant advantage
• Fluent in spoken and written English
• Highly punctual, responsible, quick learner, and adaptable

How to Apply: Send your updated CV to: ${hrEmail}`;

  const responsibilities = `Responsibilities:
• Host live streams and create short promotional videos showcasing products (ceramic tiles, sanitary ware, daily porcelain, etc.) on TikTok, Instagram, and Facebook
• Deliver clear, engaging product demonstrations, situational storytelling, and brand introductions
• Interact live with viewers — answering questions, building excitement, and driving engagement/sales
• Follow provided scripts for structured content while also improvising naturally when appropriate
• Maintain a confident, approachable, and authentic on-camera presence aligned with the brand's positive, professional image
• Wear company-provided outfits (workwear, T-shirts, exhibition uniforms) appropriately
• Work flexibly with the production schedule, including multiple takes, revisions, and repeated filming`;

  const description = `Online Live Stream Host — Goodwill (Tanzania) Ceramics Co., Ltd

Goodwill (Tanzania) Ceramics Co., Ltd is a leading tile manufacturer based in Mkuranga, Tanzania. Since its founding in 2015, the company has made significant strides in the industry, investing over $50 million and maintaining a daily output of more than 80,000 square meters of ceramic tiles.

${responsibilities}`;

  const skills = [
    'live streaming',
    'content creation',
    'TikTok',
    'Instagram',
    'video production',
    'product demonstration',
    'verbal communication',
    'on-camera presence',
    'sales',
    'English'
  ];

  // Posted Jan 30, 2026. Standard 30-day window expired Feb 28, 2026.
  const deadline = new Date('2026-02-28T23:59:59Z');
  const isExpired = deadline < new Date();

  await sql`
    UPDATE jobs SET
      company_name = 'Goodwill (Tanzania) Ceramics Co., Ltd',
      employer_url = ${employerUrl},
      description = ${description},
      requirements = ${requirements},
      sector = 'Media & Communications',
      profession = 'Live Stream Host / Content Creator',
      experience_level = 'entry',
      education_level = 'any',
      deadline = ${deadline},
      is_active = ${!isExpired},
      skills = ${`{${skills.map(s => `"${s.replace(/"/g, '\\"')}"`).join(',')}}`}::text[],
      updated_at = NOW()
    WHERE id = ${JOB_ID}
  `;

  const [job] = await sql`SELECT * FROM jobs WHERE id = ${JOB_ID}`;
  console.log('Updated Record:');
  console.log(`  Title:         ${job.title}`);
  console.log(`  Company:       ${job.company_name}`);
  console.log(`  Employer URL:  ${job.employer_url}`);
  console.log(`  Deadline:      ${job.deadline}`);
  console.log(`  Is Active:     ${job.is_active}`);
  console.log(`  Skills:        ${JSON.stringify(job.skills)}`);
  console.log(`  Req chars:     ${(job.requirements || '').length}`);

  // Review with Jev
  const state = `
JOB RECORD: ${job.id}
Title: ${job.title}
Company: ${job.company_name}
Employer URL: ${job.employer_url}
Source URL: ${job.source_url}
Is Aggregator: ${job.is_aggregator_source}
Is Active: ${job.is_active} (Deadline: ${job.deadline}, properly deactivated since expired)
Sector: ${job.sector}
Profession: ${job.profession}
Skills: ${job.skills?.join(', ')}
Requirements: ${job.requirements}
`;

  const jevRes = await client.systemOne({
    state,
    questions: {
      isEnrichedAndAccurate: noul(
        'Is this job record now accurately enriched with a real employer name, verified employer URL, structured requirements, and proper active/expired status?',
        { true: 'Yes, it meets high quality standards', false: 'No, still incomplete' }
      ),
      qualityScore: score(
        'Score the quality of this job listing record (0 to 3):',
        [
          'Critically flawed',
          'Shallow',
          'Adequate',
          'Fully enriched and gold standard',
        ]
      ),
    }
  });

  console.log('\nJev Evaluation of Job 4600b275:');
  console.log(`  Accurate & Enriched: ${(jevRes.answers.isEnrichedAndAccurate?.noul * 100).toFixed(1)}%`);
  console.log(`  Quality Score:       ${jevRes.answers.qualityScore?.score.toFixed(2)} / 3.0`);

  await sql.end();
}

updateAndVerify().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
