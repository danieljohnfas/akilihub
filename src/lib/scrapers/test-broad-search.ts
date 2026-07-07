import { config } from 'dotenv';
config({ path: '.env.local' });
import { discoverJobs } from './broad-search-engine';

async function testBroadSearch() {
  console.log('Testing Broad Search Engine...');
  const query = 'software engineer jobs in Nairobi Kenya 2026';
  
  const jobs = await discoverJobs(query, 3); // max 3 pages for testing
  
  console.log('\n--- Extraction Results ---');
  console.log(JSON.stringify(jobs, null, 2));
}

testBroadSearch();
