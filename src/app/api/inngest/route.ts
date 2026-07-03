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
  ],
});
