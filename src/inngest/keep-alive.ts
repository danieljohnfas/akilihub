import { inngest } from "./client";
import { db, safeQuery } from "@/lib/db/client";
import { sql } from "drizzle-orm";

/**
 * A scheduled background job to keep the Supabase database from pausing 
 * on the free/hobby tier due to inactivity.
 * 
 * Runs every hour and simply executes a lightweight SQL `SELECT 1` query.
 */
export const keepDatabaseAliveJob = inngest.createFunction(
  { 
    id: "keep-database-alive",
    name: "Keep Database Alive",
    triggers: [{ cron: "0 * * * *" }] // Run at the top of every hour
  },
  async ({ step }) => {
    const result = await step.run("ping-database", async () => {
      try {
        await safeQuery(db.execute(sql`SELECT 1 as keepalive`));
        return { success: true, message: "Database pinged successfully" };
      } catch (error) {
        console.error("Keep-alive ping failed:", error);
        return { success: false, error: String(error) };
      }
    });

    return { message: "Keep-alive job completed", result };
  }
);

/**
 * A scheduled background job to keep the Scraper sidecar (on Render free tier)
 * from spinning down due to inactivity. Render spins down after 15 minutes.
 * 
 * Runs every 14 minutes to ping the scraper health endpoint.
 */
export const keepScraperAliveJob = inngest.createFunction(
  {
    id: "keep-scraper-alive",
    name: "Keep Scraper Alive",
    triggers: [{ cron: "*/14 * * * *" }] // Run every 14 minutes
  },
  async ({ step }) => {
    const result = await step.run("ping-scraper", async () => {
      try {
        const sidecarUrl = (process.env.SCRAPLING_URL ?? 'http://localhost:8001').trim();
        const response = await fetch(`${sidecarUrl}/health`);
        if (response.ok) {
          return { success: true, message: "Scraper pinged successfully", status: response.status };
        } else {
          return { success: false, error: `Failed with status: ${response.status}` };
        }
      } catch (error) {
        console.error("Scraper keep-alive ping failed:", error);
        return { success: false, error: String(error) };
      }
    });

    return { message: "Scraper keep-alive job completed", result };
  }
);
