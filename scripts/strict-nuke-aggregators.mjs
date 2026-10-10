import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const { choice } = require('@typesafe-ai/sdk');
const { systemOne } = require('./scripts/clef-client.mjs');

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 5 });

async function strictNuke() {
  console.log("Fetching remaining employer domains...");
  
  const domains = await sql`
    SELECT split_part(split_part(employer_url, '://', 2), '/', 1) as domain, COUNT(*) 
    FROM jobs 
    WHERE is_active = true AND employer_url IS NOT NULL
    GROUP BY domain 
    ORDER BY COUNT(*) DESC
  `;

  console.log(`Found ${domains.length} domains to strictly evaluate.`);

  const BATCH_SIZE = 10;
  let aggregatorsFound = 0;
  let recordsFixed = 0;

  for (let i = 0; i < domains.length; i += BATCH_SIZE) {
    const batch = domains.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async ({ domain, count }) => {
      if (!domain || domain.length < 4 || domain.includes('workday') || domain.includes('oraclecloud')) return;

      try {
        const res = await systemOne({
          state: `URL Domain: ${domain}`,
          questions: {
            domainType: choice(['direct_employer_or_ats', 'job_board_or_aggregator_or_news'], 
              'Classify this domain. A direct employer is a single company\'s corporate site. A job board/aggregator/news site hosts jobs for MANY different companies.'
            )
          }
        }, { timeout: 15000 });

        const type = res.answers.domainType?.choice;
        
        if (type === 'job_board_or_aggregator_or_news') {
          aggregatorsFound++;
          recordsFixed += parseInt(count, 10);
          console.log(`[Aggregator Detected] ${domain} - Nullifying ${count} jobs.`);
          
          await sql`
            UPDATE jobs 
            SET employer_url = NULL, is_aggregator_source = true, updated_at = NOW()
            WHERE employer_url ILIKE ${'%' + domain + '%'}
          `;
        }
      } catch (e) {
        // Ignore timeouts
      }
    }));
    
    console.log(`Processed ${Math.min(i + BATCH_SIZE, domains.length)} / ${domains.length}`);
  }

  console.log(`\nSTRICT RUN DONE! Found ${aggregatorsFound} aggregator domains.`);
  console.log(`Successfully fixed ${recordsFixed} job records by removing their aggregator employer_url.`);

  await sql.end();
}

strictNuke().catch(console.error);
