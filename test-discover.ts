import { discoverJobs } from './src/lib/scrapers/broad-search-engine';
import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  console.log('Testing discoverJobs with "IT jobs in Nairobi"');
  try {
    const jobs = await discoverJobs('IT jobs in Nairobi', 1);
    console.log('Found ' + jobs.length + ' jobs.');
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
main();
