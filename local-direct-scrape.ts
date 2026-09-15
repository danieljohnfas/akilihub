import { runKnownSourcesForCountryProxy, runQueriesForCountryProxy } from "./src/inngest/scrape-jobs";

async function main() {
  console.log("🚀 Starting direct local scrape for Tanzania (TZ) Jobs...");
  try {
    const tzQueries = [
      "ajira mpya Tanzania Dar es Salaam 2026",
      "jobs vacancies Tanzania 2026",
      "nafasi za kazi Tanzania 2026",
      "NGO jobs Tanzania 2026",
      "site:reliefweb.int jobs Tanzania",
      "site:ngojobsinafrica.com Tanzania",
      "IT software developer jobs Dar es Salaam 2026",
      "health medical jobs Tanzania 2026",
      "finance accounting ajira Tanzania 2026",
      "UN WFP UNICEF jobs Tanzania 2026",
    ];
    
    console.log("Running known sources...");
    const known = await runKnownSourcesForCountryProxy("TZ", "local-tz-known");
    console.log("Known sources inserted:", known);
    
    console.log("Running search queries...");
    const search = await runQueriesForCountryProxy(tzQueries, "TZ", "local-tz-search");
    console.log("Search queries inserted:", search);
    
    console.log("✅ TZ scrape complete!");
  } catch (error) {
    console.error("❌ Scrape failed:", error);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
