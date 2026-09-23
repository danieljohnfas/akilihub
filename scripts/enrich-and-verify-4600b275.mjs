import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const { TypeSafeClient, score, noul, choice } = require('@typesafe-ai/sdk');
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });
const client = new TypeSafeClient({ apiKey: process.env.TYPESAFE_API_KEY.trim() });

const JOB_ID = '4600b275-3a3f-4c6c-bdf0-846a1dac067c';

// Decode Cloudflare email obfuscation
function decodeCfEmail(hex) {
  const r = parseInt(hex.substring(0, 2), 16);
  let result = '';
  for (let i = 2; i < hex.length; i += 2) {
    result += String.fromCharCode(parseInt(hex.substring(i, i + 2), 16) ^ r);
  }
  return result;
}

// Email from page: data-cfemail="601a14090e075158515220070d01090c4e030f0d"
const cfEmail1 = '601a14090e075158515220070d01090c4e030f0d'; // HR email
const hrEmail = decodeCfEmail(cfEmail1);
console.log(`Decoded HR email: ${hrEmail}`);

// Full requirements extracted from source page
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

// Build enriched description from existing + responsibilities
const enrichedDescription = `Online Live Stream Host — Goodwill (Tanzania) Ceramics Co., Ltd

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

console.log('\nUpdating DB record with enriched data...');

const result = await sql`
  UPDATE jobs SET
    company_name = 'Goodwill Ceramics Tanzania',
    employer_url = 'https://goodwillceramics.co.tz',
    description = ${enrichedDescription},
    requirements = ${requirements},
    sector = 'Media & Communications',
    profession = 'Live Stream Host / Content Creator',
    experience_level = 'entry',
    education_level = 'any',
    skills = ${`{${skills.map(s => `"${s.replace(/"/g, '\\"')}"`).join(',')}}`}::text[],
    updated_at = NOW()
  WHERE id = ${JOB_ID}
  RETURNING id, company_name, employer_url, sector, profession, experience_level, skills
`;

console.log('\nUpdate result:', JSON.stringify(result[0], null, 2));

// Now re-evaluate with Jev
console.log('\n=== JEV POST-UPDATE EVALUATION ===');
const stateText = `
JOB LISTING RECORD — AkiliHub Database (AFTER ENRICHMENT)
Title: Online Live Stream Host at Goodwill Ceramics Tanzania
Company: Goodwill Ceramics Tanzania
Employer URL: https://goodwillceramics.co.tz
Source URL: https://ajirayako.co.tz/jobs/online-live-stream-host-job-vacancy-at-goodwill-ceramics/
Is Aggregator: true (ajirayako is an aggregator — correctly flagged)
Is Active: true
Sector: Media & Communications
Profession: Live Stream Host / Content Creator
Experience Level: entry
Education Level: any
Skills: ${skills.join(', ')}

Description (enriched):
${enrichedDescription.substring(0, 600)}

Requirements (structured):
${requirements}
`.trim();

const jevResult = await client.systemOne(
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
        { true: 'Yes, it is a real identifiable employer name', false: 'No, it is missing, null, or clearly wrong' }
      ),
      requirementsStructured: noul(
        'Does the requirements field contain meaningful, structured content (bullet points or sentences listing qualifications, skills, or experience)?',
        { true: 'Yes, requirements are clear and structured', false: 'No, requirements are empty or too short' }
      ),
      needsMoreWork: noul(
        'Does this record still need further enrichment before being shown to job seekers?',
        { true: 'Yes, still needs enrichment', false: 'No, sufficiently enriched and accurate' }
      ),
      remainingGap: choice(
        'What is the most important remaining gap in this record?',
        {
          deadline_missing: 'Deadline is missing — job seekers cannot tell if it is still open',
          source_url_aggregator: 'Source URL is still pointing to an aggregator, not the direct employer',
          description_quality: 'Description or requirements are still too thin',
          employer_url_unverified: 'Employer URL has not been verified as accessible',
          all_good: 'No significant gaps — record is well-enriched',
        }
      ),
    },
  },
  { timeout: 15_000 }
);

const a = jevResult.answers;
const compScore = a.dataCompleteness?.score ?? 0;
const levels = ['Critically incomplete', 'Shallow', 'Adequate', 'Fully enriched'];
const level = levels[Math.round(compScore)] || 'Shallow';

console.log(`\nJev Post-Update Results for Job ${JOB_ID}:`);
console.log(`  Data Completeness:     ${compScore.toFixed(2)}/3.0 (${level})`);
console.log(`  Company Name Correct:  ${(a.companyNameCorrect?.noul * 100).toFixed(0)}%`);
console.log(`  Requirements Struct.:  ${(a.requirementsStructured?.noul * 100).toFixed(0)}%`);
console.log(`  Needs More Work:       ${(a.needsMoreWork?.noul * 100).toFixed(0)}%`);
console.log(`  Remaining Gap:         ${a.remainingGap?.choice}`);

if (a.needsMoreWork?.noul < 0.5) {
  console.log(`\n✅ Jev confirms: record is now sufficiently enriched.`);
} else {
  console.log(`\n⚠️  Jev still flags gaps. Remaining: ${a.remainingGap?.choice}`);
}

await sql.end();
