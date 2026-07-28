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
