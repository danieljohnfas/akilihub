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

async function main() {
  console.log('Auditing database data quality metrics across ALL jobs...\n');

  const [totalRes] = await sql`SELECT COUNT(*)::int as count FROM jobs`;
  const [traRes] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE company_name = 'TRA'`;
  const [nullCompanyRes] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE company_name IS NULL OR TRIM(company_name) = ''`;
  const [nullReqRes] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE requirements IS NULL OR LENGTH(TRIM(requirements)) < 20`;
  const [cfEmailRes] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE description LIKE '%[email protected]%' OR requirements LIKE '%[email protected]%'`;
  const [nullEmployerRes] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE employer_url IS NULL`;
  const [aggregatorCountRes] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE is_aggregator_source = true`;
  const [nullSkillsRes] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE skills IS NULL OR array_length(skills, 1) IS NULL`;
  const [nullSectorRes] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE sector IS NULL`;

  const total = totalRes.count;
  const tra = traRes.count;
  const nullCompany = nullCompanyRes.count;
  const nullReq = nullReqRes.count;
  const cfEmail = cfEmailRes.count;
  const nullEmployer = nullEmployerRes.count;
  const aggregators = aggregatorCountRes.count;
  const nullSkills = nullSkillsRes.count;
  const nullSector = nullSectorRes.count;

  console.log(`=== DATABASE DATA HEALTH AUDIT ===`);
  console.log(`Total jobs in database:         ${total}`);
  console.log(`Jobs with company_name = 'TRA':  ${tra} (${((tra/total)*100).toFixed(1)}%)`);
  console.log(`Jobs with NULL/empty company:    ${nullCompany} (${((nullCompany/total)*100).toFixed(1)}%)`);
  console.log(`Jobs with missing requirements:  ${nullReq} (${((nullReq/total)*100).toFixed(1)}%)`);
  console.log(`Jobs with [email protected]:     ${cfEmail} (${((cfEmail/total)*100).toFixed(1)}%)`);
  console.log(`Jobs with NULL employer_url:     ${nullEmployer} (${((nullEmployer/total)*100).toFixed(1)}%)`);
  console.log(`Jobs flagged as aggregator:      ${aggregators} (${((aggregators/total)*100).toFixed(1)}%)`);
  console.log(`Jobs with NULL/empty skills:     ${nullSkills} (${((nullSkills/total)*100).toFixed(1)}%)`);
  console.log(`Jobs with NULL sector:           ${nullSector} (${((nullSector/total)*100).toFixed(1)}%)`);

  // Build state for Jev to review
  const stateText = `
DATABASE HEALTH AUDIT REPORT — AKILIHUB
Total Jobs in Database: ${total}
Corrupted 'TRA' Company Names: ${tra} (${((tra/total)*100).toFixed(1)}%)
Missing/Empty Company Names: ${nullCompany} (${((nullCompany/total)*100).toFixed(1)}%)
Jobs Missing Requirements: ${nullReq} (${((nullReq/total)*100).toFixed(1)}%)
Jobs with Cloudflare Obfuscated Email ([email protected]): ${cfEmail} (${((cfEmail/total)*100).toFixed(1)}%)
Jobs Missing Employer URL: ${nullEmployer} (${((nullEmployer/total)*100).toFixed(1)}%)
Jobs Flagged as Aggregators: ${aggregators} (${((aggregators/total)*100).toFixed(1)}%)
Jobs Missing Skills Array: ${nullSkills} (${((nullSkills/total)*100).toFixed(1)}%)
Jobs Missing Sector: ${nullSector} (${((nullSector/total)*100).toFixed(1)}%)
`.trim();

  console.log('\nEvaluating database completeness with Jev System One...\n');

  const result = await client.systemOne({
    state: stateText,
    questions: {
      hasAllDataBeenUpdated: noul(
        'Based on this audit report, has ALL data in the database actually been updated and enriched to standards?',
        {
          true: 'Yes, all data or virtually 100% has been fully updated and cleaned',
          false: 'No, a large portion of the database still has corrupted company names, missing requirements, or un-decoded emails',
        }
      ),
      enrichmentMaturityScore: score(
        'Score the completeness of the database enrichment (0=Virtually untouched, 1=Early/partial sample only, 2=Substantial progress, 3=Fully completed):',
        [
          'Virtually untouched: over 70% of records suffer from corrupted data or missing requirements',
          'Early/partial: only a small sample or test batch was processed; thousands remain untouched',
          'Substantial: majority of records enriched, with small remaining tail',
          'Fully completed: near 100% of records adhering to gold standards',
        ]
      ),
      honestVerdict: choice(
        'What is the honest verdict on whether all data in the database was updated?',
        {
          not_updated_yet: 'No, only a small test batch was updated; the vast majority of database records are still untouched and need bulk enrichment',
          mostly_updated: 'Most records were updated, only a few outliers remain',
          fully_updated: 'Yes, all records have been updated to standards',
        }
      ),
    }
  });

  console.log('=== JEV SYSTEM ONE VERDICT ===');
  console.log(`Has all data been updated? ${(result.answers.hasAllDataBeenUpdated?.noul * 100).toFixed(1)}%`);
  console.log(`Enrichment maturity score: ${result.answers.enrichmentMaturityScore?.score.toFixed(2)}/3.0`);
  console.log(`Honest verdict:           ${result.answers.honestVerdict?.choice}`);

  await sql.end();
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
