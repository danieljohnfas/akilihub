import { config } from 'dotenv';
config({ path: '.env.local' });

import { scrapePPRATZ } from './src/lib/scrapers/ppra-tz';
import { scrapePPRAKenya } from './src/lib/scrapers/ppoa-ke';
import { scrapePPDAUganda } from './src/lib/scrapers/ppda-ug';
import { scrapeRPPARwanda } from './src/lib/scrapers/rppa-rw';
import { scrapePPPAEthiopia } from './src/lib/scrapers/pppa-et';
import { scrapeARMPCongoDRC } from './src/lib/scrapers/armp-cd';
import { scrapeTRAResources } from './src/lib/scrapers/tra-tz-resources';
import { scrapeKRAResources } from './src/lib/scrapers/kra-ke-resources';
import { scrapeBRELAResources } from './src/lib/scrapers/brela-tz-resources';

async function runAll() {
  console.log('🚀 Starting forced manual execution of all scrapers...');
  let totalTenders = 0;
  let totalCompliance = 0;

  // Tenders
  try {
    console.log('\n--- 🇹🇿 PPRA Tanzania Tenders ---');
    totalTenders += await scrapePPRATZ();
  } catch (e: any) { console.error('Failed PPRA TZ:', e.message); }

  try {
    console.log('\n--- 🇰🇪 PPOA Kenya Tenders ---');
    totalTenders += await scrapePPRAKenya();
  } catch (e: any) { console.error('Failed PPOA KE:', e.message); }

  try {
    console.log('\n--- 🇺🇬 PPDA Uganda Tenders ---');
    totalTenders += await scrapePPDAUganda();
  } catch (e: any) { console.error('Failed PPDA UG:', e.message); }

  try {
    console.log('\n--- 🇷🇼 RPPA Rwanda Tenders ---');
    totalTenders += await scrapeRPPARwanda();
  } catch (e: any) { console.error('Failed RPPA RW:', e.message); }

  try {
    console.log('\n--- 🇪🇹 PPPA Ethiopia Tenders ---');
    totalTenders += await scrapePPPAEthiopia();
  } catch (e: any) { console.error('Failed PPPA ET:', e.message); }

  try {
    console.log('\n--- 🇨🇩 ARMP Congo DRC Tenders ---');
    totalTenders += await scrapeARMPCongoDRC();
  } catch (e: any) { console.error('Failed ARMP CD:', e.message); }

  // Compliance
  try {
    console.log('\n--- 🇹🇿 TRA Tanzania Compliance Resources ---');
    totalCompliance += await scrapeTRAResources();
  } catch (e: any) { console.error('Failed TRA TZ:', e.message); }

  try {
    console.log('\n--- 🇰🇪 KRA Kenya Compliance Resources ---');
    totalCompliance += await scrapeKRAResources();
  } catch (e: any) { console.error('Failed KRA KE:', e.message); }

  try {
    console.log('\n--- 🇹🇿 BRELA Tanzania Compliance Resources ---');
    totalCompliance += await scrapeBRELAResources();
  } catch (e: any) { console.error('Failed BRELA TZ:', e.message); }

  console.log('\n✅ Manual execution completed!');
  console.log(`Total new Tenders inserted: ${totalTenders}`);
  console.log(`Total new Compliance resources inserted: ${totalCompliance}`);
  process.exit(0);
}

runAll().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
