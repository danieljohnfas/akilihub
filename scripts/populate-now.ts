import { scrapePPRATZ } from '../src/lib/scrapers/ppra-tz';
import { scrapePPRAKenya } from '../src/lib/scrapers/ppoa-ke';
import { scrapePPDAUganda } from '../src/lib/scrapers/ppda-ug';
import { scrapeRPPARwanda } from '../src/lib/scrapers/rppa-rw';
import { scrapePPPAEthiopia } from '../src/lib/scrapers/pppa-et';
import { scrapeARMPCongoDRC } from '../src/lib/scrapers/armp-cd';
import { fetchAllHealthIndicators } from '../src/lib/scrapers/health-world-bank';
import { config } from 'dotenv';

// Load environment variables for local execution
config({ path: '.env.local' });

async function runAllScrapers() {
  console.log('🚀 Starting Data Population (Real Data Only) 🚀\n');

  try {
    console.log('--- 🏥 Fetching Health Data (WHO GHO API) ---');
    await fetchAllHealthIndicators();

    console.log('\n--- 🇹🇿 Fetching Tanzania Tenders (PPRA) ---');
    await scrapePPRATZ();

    console.log('\n--- 🇰🇪 Fetching Kenya Tenders (PPRA) ---');
    await scrapePPRAKenya();

    console.log('\n--- 🇺🇬 Fetching Uganda Tenders (PPDA) ---');
    await scrapePPDAUganda();

    console.log('\n--- 🇷🇼 Fetching Rwanda Tenders (RPPA) ---');
    await scrapeRPPARwanda();

    console.log('\n--- 🇪🇹 Fetching Ethiopia Tenders (PPPA) ---');
    await scrapePPPAEthiopia();

    console.log('\n--- 🇨🇩 Fetching Congo DRC Tenders (ARMP) ---');
    await scrapeARMPCongoDRC();

    console.log('\n✅ All data population scripts finished successfully.');
  } catch (error) {
    console.error('\n❌ An error occurred during data population:', error);
  } finally {
    process.exit(0);
  }
}

runAllScrapers();
