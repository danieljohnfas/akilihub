export const maxDuration = 300; // Allow up to 5 mins for headless scraping

import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";

// Tenders
import {
  scrapePPRATanzaniaJob,
  scrapePPRAKenyaJob,
  scrapePPDAUgandaJob,
  scrapeRPPARwandaJob,
  scrapePPPAEthiopiaJob,
  scrapeARMPCongoDRCJob,
} from "@/inngest/scrape-tenders";

// Compliance (now daily, broad search)
import {
  scrapeTRAResourcesJob,
  scrapeKRAResourcesJob,
  scrapeBRELAResourcesJob,
} from "@/inngest/scrape-compliance";

// Jobs (new daily automation)
import {
  scrapeJobsKenyaJob,
  scrapeJobsTanzaniaJob,
  scrapeJobsUgandaJob,
  scrapeJobsRwandaJob,
} from "@/inngest/scrape-jobs";

// Alerts and monitoring
import { sendTenderAlertsJob } from "@/inngest/send-alerts";
import { fetchHealthDataJob } from "@/inngest/fetch-health";
import { enforceDataFreshnessJob } from "@/inngest/enforce-freshness";
import { checkDataStatusJob } from "@/inngest/check-data-status";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // Tenders – 6-country daily broad search (00:00–02:30 UTC)
    scrapePPRATanzaniaJob,
    scrapePPRAKenyaJob,
    scrapePPDAUgandaJob,
    scrapeRPPARwandaJob,
    scrapePPPAEthiopiaJob,
    scrapeARMPCongoDRCJob,

    // Compliance – 3-source daily broad search (03:00–04:00 UTC)
    scrapeTRAResourcesJob,
    scrapeKRAResourcesJob,
    scrapeBRELAResourcesJob,

    // Jobs – 4-country daily broad search (04:30–06:00 UTC)
    scrapeJobsKenyaJob,
    scrapeJobsTanzaniaJob,
    scrapeJobsUgandaJob,
    scrapeJobsRwandaJob,

    // Tender new-record alerts (event-driven)
    sendTenderAlertsJob,

    // Health data (03:00 UTC)
    fetchHealthDataJob,

    // Data freshness enforcement (06:00 and 18:00 UTC)
    enforceDataFreshnessJob,

    // Daily data-starvation check & alert (23:50 UTC)
    checkDataStatusJob,
  ],
});
