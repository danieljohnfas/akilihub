import { scrapePPDAUganda } from './src/lib/scrapers/ppda-ug';
import { scrapePPRATZ } from './src/lib/scrapers/ppra-tz';
import { config } from 'dotenv';
config({ path: '.env.local' });

async function run() {
  console.log('Testing PPDA Uganda scraper...');
  const count = await scrapePPDAUganda();
  console.log('Uganda returned:', count);
  
  console.log('Testing PPRA TZ scraper...');
  const count2 = await scrapePPRATZ();
  console.log('TZ returned:', count2);
  
  process.exit(0);
}

run().catch(console.error);
