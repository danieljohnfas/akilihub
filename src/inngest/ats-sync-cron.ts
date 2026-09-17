import { inngest } from "./client";
import { runAtsSync } from "../lib/scrapers/ats-sync";

/**
 * Deterministic Zero-Cost Job Sync
 * Runs daily at midnight UTC to directly poll the ATS APIs of major African employers.
 * Replaces the brittle/expensive Exa AI scraping method.
 */
export const atsSyncCronJob = inngest.createFunction(
  { 
    id: "ats-sync-daily",
    name: "Daily Direct ATS Synchronization",
    concurrency: 1,
    triggers: [{ cron: "0 0 * * *" }]
  },
  async ({ step }) => {
    await step.run("sync-ats-apis", async () => {
      const insertedCount = await runAtsSync();
      return { status: "success", newJobsInserted: insertedCount };
    });
  }
);
