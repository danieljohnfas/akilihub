import { score, noul, choice } from '@typesafe-ai/sdk';
import { systemOne } from './clef-client.mjs';
import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// We include jev just in case it's needed or requested by the environment structure.
const jev = { systemOne };
const sql = postgres(process.env.DATABASE_URL);

async function run() {
  console.log('Fetching compliance requirements...');
  const compliances = await sql`SELECT id, title, description, renewal_period_days, estimated_cost FROM compliance_requirements WHERE renewal_period_days IS NULL OR estimated_cost IS NULL`;
  
  let updated = 0;
  for (const req of compliances) {
    console.log(`Processing compliance: ${req.title}`);
    
    let renewalPeriodDays = req.renewal_period_days;
    let estimatedCost = req.estimated_cost;
    
    // Simple regex for renewal period (e.g. "renewal every 30 days", "annual renewal", "valid for 1 year")
    if (!renewalPeriodDays) {
      if (/annual|yearly|1 year|one year/i.test(req.description)) {
        renewalPeriodDays = 365;
      } else if (/monthly|1 month|one month/i.test(req.description)) {
        renewalPeriodDays = 30;
      } else if (/quarterly|3 months|three months/i.test(req.description)) {
        renewalPeriodDays = 90;
      } else {
        const daysMatch = req.description.match(/(\d+)\s*days?/i);
        if (daysMatch) {
          renewalPeriodDays = parseInt(daysMatch[1], 10);
        }
      }
    }
    
    // Simple regex for estimated cost (e.g. "Cost: $500", "Fee: 1000 KES")
    if (!estimatedCost) {
      const costMatch = req.description.match(/(?:cost|fee|price)\s*(?:is|:|-)?\s*([$\xA3\u20ACa-zA-Z]{0,3}\s*\d+(?:,\d{3})*(?:\.\d{2})?\s*[a-zA-Z]{0,3})/i);
      if (costMatch) {
        estimatedCost = costMatch[1].trim();
      }
    }
    
    if (renewalPeriodDays !== req.renewal_period_days || estimatedCost !== req.estimated_cost) {
      await sql`UPDATE compliance_requirements SET renewal_period_days = ${renewalPeriodDays || null}, estimated_cost = ${estimatedCost || null} WHERE id = ${req.id}`;
      updated++;
      console.log(`Updated ${req.title}: renewal_period_days=${renewalPeriodDays}, estimated_cost=${estimatedCost}`);
    }
  }
  
  console.log(`Finished updating ${updated} compliance requirements.`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
