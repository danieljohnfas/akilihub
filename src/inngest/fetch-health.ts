import { inngest } from "./client";
import { fetchAllHealthIndicators } from "@/lib/scrapers/health-world-bank";

/**
 * Runs daily at 03:00 UTC — after all tender scraping jobs finish.
 * Fetches live health indicator data from the WHO Global Health Observatory
 * for all 6 East African countries (KE, TZ, UG, RW, ET, CD).
 */
export const fetchHealthDataJob = inngest.createFunction(
  {
    id: "fetch-health-data",
    name: "🏥 Fetch WHO Health Data (All EA Countries)",
    triggers: [{ cron: "0 3 * * *" }],
  },
  async ({ step }) => {
    const inserted = await step.run("fetch-who-gho-indicators", async () => {
      return await fetchAllHealthIndicators();
    });

    return {
      message: `Fetched and inserted ${inserted} WHO health data points across East Africa.`,
    };
  }
);
