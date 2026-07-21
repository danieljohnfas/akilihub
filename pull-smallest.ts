import { config } from 'dotenv';
config({ path: '.env.local' });
import { fetchAllHealthIndicators } from './src/lib/scrapers/health-world-bank';
import { execSync } from 'child_process';

async function runJobs() {
  console.log('Starting data pull for areas with smallest data quantities...\n');

  console.log('1. Pulling Health Data (9 indicators currently)...');
  try {
    const healthResult = await fetchAllHealthIndicators();
    console.log(`Health Data Pull Complete. New points: ${healthResult}\n`);
  } catch (err: any) {
    console.error('Error pulling health data:', err.message);
  }

  console.log('2. Pulling Tenders (and Compliance) Data (16 tenders currently)...');
  try {
    execSync('npx tsx run-all-scrapers.ts', { stdio: 'inherit' });
    console.log('Tenders Data Pull Complete.\n');
  } catch (err: any) {
    console.error('Error pulling tenders data:', err.message);
  }

  console.log('Data pull job finished.');
  process.exit(0);
}

runJobs();
