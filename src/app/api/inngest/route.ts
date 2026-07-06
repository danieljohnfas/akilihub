export const maxDuration = 300; // Allow up to 5 mins for headless scraping

import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import {
  scrapePPRATanzaniaJob,
  scrapePPRAKenyaJob,
  scrapePPDAUgandaJob,
  scrapeRPPARwandaJob,
  scrapePPPAEthiopiaJob,
  scrapeARMPCongoDRCJob,
} from "@/inngest/scrape-tenders";
import { sendTenderAlertsJob } from "@/inngest/send-alerts";
import { fetchHealthDataJob } from "@/inngest/fetch-health";
import { enforceDataFreshnessJob } from "@/inngest/enforce-freshness";
import {
  scrapeTRAResourcesJob,
  scrapeKRAResourcesJob,
  scrapeBRELAResourcesJob,
} from "@/inngest/scrape-compliance";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // 6-country scraper jobs
    scrapePPRATanzaniaJob,
    scrapePPRAKenyaJob,
    scrapePPDAUgandaJob,
    scrapeRPPARwandaJob,
    scrapePPPAEthiopiaJob,
    scrapeARMPCongoDRCJob,
    // Alert job
    sendTenderAlertsJob,
    fetchHealthDataJob,
    // Compliance resource jobs
    scrapeTRAResourcesJob,
    scrapeKRAResourcesJob,
    scrapeBRELAResourcesJob,
    // Data freshness enforcement (runs twice daily)
    enforceDataFreshnessJob,
  ],
});
