import { discoverTenders } from './src/lib/scrapers/broad-search-engine-tenders';
import { discoverJobs } from './src/lib/scrapers/broad-search-engine';
import { discoverCompliance } from './src/lib/scrapers/broad-search-engine-compliance';

async function main() {
  console.log("=== Testing Scraping & Ingestion ===");
  
  try {
    console.log("\\n--- Testing Tenders ---");
    // Limit to 1 max page so we don't scrape forever
    const tenders = await discoverTenders("tanzania government tenders portal active", 1);
    console.log("Tenders Found:", JSON.stringify(tenders, null, 2));

    console.log("\\n--- Testing Jobs ---");
    const jobs = await discoverJobs("software engineering jobs nairobi", 1);
    console.log("Jobs Found:", JSON.stringify(jobs, null, 2));

    console.log("\\n--- Testing Compliance ---");
    const compliance = await discoverCompliance("kenya KRA tax regulations 2025", 1);
    console.log("Compliance Resources Found:", JSON.stringify(compliance, null, 2));

  } catch (error) {
    console.error("Test failed:", error);
  }
}

main();
