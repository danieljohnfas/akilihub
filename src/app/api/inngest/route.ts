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
  scrapeARMPBurundiJob,
  scrapeMOFSomaliaJob,
  scrapeGPOCSouthSudanJob,
} from "@/inngest/scrape-tenders";

// Compliance (now daily, broad search)
import {
  scrapeComplianceKenyaJob,
  scrapeComplianceTanzaniaJob,
  scrapeComplianceUgandaJob,
  scrapeComplianceRwandaJob,
  scrapeComplianceEthiopiaJob,
  scrapeComplianceDRCJob,
  scrapeComplianceBurundiJob,
  scrapeComplianceSomaliaJob,
  scrapeComplianceSouthSudanJob,
} from "@/inngest/scrape-compliance";

// Jobs (new daily automation)
import {
  scrapeJobsKenyaJob,
  scrapeJobsTanzaniaJob,
  scrapeJobsUgandaJob,
  scrapeJobsRwandaJob,
  scrapeJobsEthiopiaJob,
  scrapeJobsDRCJob,
  scrapeJobsBurundiJob,
  scrapeJobsSomaliaJob,
  scrapeJobsSouthSudanJob,
} from "@/inngest/scrape-jobs";

// Salaries
import {
  scrapeSalariesKenyaJob,
  scrapeSalariesTanzaniaJob,
  scrapeSalariesUgandaJob,
  scrapeSalariesRwandaJob,
  scrapeSalariesEthiopiaJob,
  scrapeSalariesDRCJob,
  scrapeSalariesBurundiJob,
  scrapeSalariesSomaliaJob,
  scrapeSalariesSouthSudanJob,
} from "@/inngest/scrape-salaries";

// Health
import {
  scrapeHealthKenyaJob,
  scrapeHealthTanzaniaJob,
  scrapeHealthUgandaJob,
  scrapeHealthRwandaJob,
  scrapeHealthEthiopiaJob,
  scrapeHealthDRCJob,
  scrapeHealthBurundiJob,
  scrapeHealthSomaliaJob,
  scrapeHealthSouthSudanJob,
} from "@/inngest/scrape-health";

// Alerts and monitoring
import { sendTenderAlertsJob, sendDailyDigestJob, sendWeeklyNewsletterJob, sendReengagementAlertsJob } from "@/inngest/send-alerts";
import { sendWelcomeEmailsJob } from "@/inngest/send-welcome";
import { fetchHealthDataJob } from "@/inngest/fetch-health";
import { syncHealthDataJob } from "@/inngest/sync-health-data";
import { enforceDataFreshnessJob } from "@/inngest/enforce-freshness";
import { checkDataStatusJob } from "@/inngest/check-data-status";
import { salaryConsensusVerificationJob } from "@/inngest/salary-consensus";
import { generateWeeklyGuidesJob } from "@/inngest/generate-guides";
import { keepDatabaseAliveJob, keepScraperAliveJob } from "@/inngest/keep-alive";
// Rescrape
import { rescrapeJobsJob, rescrapeTendersJob, rescrapeComplianceJob } from "@/inngest/rescrape-all";

// Data quality: daily shallow-record enrichment
import { enrichShallowDataJob } from "@/inngest/enrich-shallow-data";

// Employer-first sourcing: retroactive URL resolution backfill
import { resolveEmployerUrlsJob } from "@/inngest/resolve-employer-urls";

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
    scrapeARMPBurundiJob,
    scrapeMOFSomaliaJob,
    scrapeGPOCSouthSudanJob,

    // Compliance – 6-country daily broad search
    scrapeComplianceKenyaJob,
    scrapeComplianceTanzaniaJob,
    scrapeComplianceUgandaJob,
    scrapeComplianceRwandaJob,
    scrapeComplianceEthiopiaJob,
    scrapeComplianceDRCJob,
    scrapeComplianceBurundiJob,
    scrapeComplianceSomaliaJob,
    scrapeComplianceSouthSudanJob,

    // Jobs – 6-country daily broad search
    scrapeJobsKenyaJob,
    scrapeJobsTanzaniaJob,
    scrapeJobsUgandaJob,
    scrapeJobsRwandaJob,
    scrapeJobsEthiopiaJob,
    scrapeJobsDRCJob,
    scrapeJobsBurundiJob,
    scrapeJobsSomaliaJob,
    scrapeJobsSouthSudanJob,
    
    // Salaries
    scrapeSalariesKenyaJob,
    scrapeSalariesTanzaniaJob,
    scrapeSalariesUgandaJob,
    scrapeSalariesRwandaJob,
    scrapeSalariesEthiopiaJob,
    scrapeSalariesDRCJob,
    scrapeSalariesBurundiJob,
    scrapeSalariesSomaliaJob,
    scrapeSalariesSouthSudanJob,

    // Health
    scrapeHealthKenyaJob,
    scrapeHealthTanzaniaJob,
    scrapeHealthUgandaJob,
    scrapeHealthRwandaJob,
    scrapeHealthEthiopiaJob,
    scrapeHealthDRCJob,
    scrapeHealthBurundiJob,
    scrapeHealthSomaliaJob,
    scrapeHealthSouthSudanJob,

    // Tender new-record alerts (event-driven)
    sendTenderAlertsJob,
    
    // Scheduled Newsletters and Digests
    sendDailyDigestJob,
    sendWeeklyNewsletterJob,
    sendReengagementAlertsJob,
    sendWelcomeEmailsJob,

    // Health data — WHO GHO + DHIS2 sync (Monday 03:00 UTC)
    fetchHealthDataJob,
    syncHealthDataJob,

    // Data freshness enforcement (06:00 and 18:00 UTC)
    enforceDataFreshnessJob,

    // Daily data-starvation check & alert (23:50 UTC)
    checkDataStatusJob,

    // Salary verification – nightly consensus clustering (02:00 UTC)
    salaryConsensusVerificationJob,

    // Weekly AI editorial guides generation (Monday 08:00 UTC)
    generateWeeklyGuidesJob,

    // Database anti-sleep ping (Hourly)
    keepDatabaseAliveJob,
    keepScraperAliveJob,

    // Continuous deep rescraping
    rescrapeJobsJob,
    rescrapeTendersJob,
    rescrapeComplianceJob,

    // Daily shallow-record enrichment (11:30 UTC — after all scrapers finish)
    enrichShallowDataJob,

    // Employer-first sourcing: retroactive URL resolution (12:30 UTC)
    resolveEmployerUrlsJob,
  ],
});

