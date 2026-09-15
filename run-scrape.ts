import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

console.log('Loaded envs. Starting massive scrape...');
import('./scripts/massive-scrape.js').catch(err => {
  console.log('Failed to import massive-scrape.js (try .ts)', err);
  import('./scripts/massive-scrape.ts');
});
