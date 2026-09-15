import { searchGoogle } from '../src/lib/scrapers/broad-search-engine';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
console.log('starting search...');
async function run() {
  const urls = await searchGoogle('NGO jobs Dar es Salaam Tanzania 2026', 2);
  console.log('Results:', urls);
}
run().then(() => console.log('done')).catch(console.error);
