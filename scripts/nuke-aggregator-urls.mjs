import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const { noul } = require('@typesafe-ai/sdk');
const { systemOne } = require('./scripts/clef-client.mjs');

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 5 });

async function fixAggregators() {
  console.log("Fetching unique employer domains...");
  
  const domains = await sql`
    SELECT split_part(split_part(employer_url, '://', 2), '/', 1) as domain, COUNT(*) 
    FROM jobs 
    WHERE is_active = true AND employer_url IS NOT NULL
    GROUP BY domain 
    ORDER BY COUNT(*) DESC
  `;

  console.log(`Found ${domains.length} unique domains to evaluate.`);

  const BATCH_SIZE = 10;
  let aggregatorsFound = 0;
  let recordsFixed = 0;

  for (let i = 0; i < domains.length; i += BATCH_SIZE) {
    const batch = domains.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async ({ domain, count }) => {
      if (!domain || domain.length < 3) return;

      try {
        const res = await systemOne({
          state: `URL Domain: ${domain}`,
          questions: {
            isAggregator: noul('Is this domain a job board or job aggregator (like Indeed, LinkedIn, BrighterMonday, JobWeb)?')
          }
        }, { timeout: 15000 });

        const prob = res.answers.isAggregator?.noul ?? 0;
        
        // Also manually catch Google Forms / Docs just in case
        const isForm = domain.includes('forms.gle') || domain.includes('docs.google.com');

        if (prob > 0.6 && !isForm && !domain.includes('workday') && !domain.includes('oraclecloud')) {
          aggregatorsFound++;
          recordsFixed += parseInt(count, 10);
          console.log(`[Aggregator Detected] ${domain} (Prob: ${prob.toFixed(2)}) - Nullifying ${count} jobs.`);
          
          await sql`
            UPDATE jobs 
            SET employer_url = NULL, is_aggregator_source = true, updated_at = NOW()
            WHERE employer_url ILIKE ${'%' + domain + '%'}
          `;
        }
      } catch (e) {
        // Silently ignore Jev timeouts on individual domains
      }
    }));
    
    console.log(`Processed ${Math.min(i + BATCH_SIZE, domains.length)} / ${domains.length}`);
  }

  console.log(`\nDONE! Found ${aggregatorsFound} aggregator domains.`);
  console.log(`Successfully fixed ${recordsFixed} job records by removing their aggregator employer_url.`);

  await sql.end();
}

fixAggregators().catch(console.error);
