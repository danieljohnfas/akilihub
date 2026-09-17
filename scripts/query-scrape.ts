import 'dotenv/config';
import { runQueriesForCountryProxy } from '../src/inngest/scrape-jobs';

async function main() {
  console.log("Running direct query scraper...");
  await runQueriesForCountryProxy([
    "latest software engineer jobs Nairobi Kenya 2026",
    "ajira mpya benki Tanzania 2026",
    "NGO jobs Kampala Uganda 2026"
  ], "KE", "manual-test");
  console.log("Done!");
}
main().catch(console.error).finally(() => process.exit(0));
