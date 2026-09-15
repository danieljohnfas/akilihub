import { runKnownSourcesForCountryProxy } from '../src/inngest/scrape-jobs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function run() {
  console.log('Running known sources for TZ...');
  const inserted = await runKnownSourcesForCountryProxy('TZ', 'manual');
  console.log('Inserted: ' + inserted);
  process.exit(0);
}
run().catch(console.error);
