import { inngest } from "./client";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema/jobs";
import { sql } from "drizzle-orm";

export const deduplicateJobsJob = inngest.createFunction(
  {
    id: "deduplicate-jobs",
    name: "🧹 Deduplicate Jobs",
    triggers: [
      { cron: "0 3 * * *" }, // Run daily at 03:00 UTC
    ],
  },
  async ({ step }) => {
    // Group jobs by title and company_name, and mark older duplicates as inactive
    const result = await step.run("flag-duplicates", async () => {
      const query = sql`
        WITH duplicates AS (
          SELECT id,
                 ROW_NUMBER() OVER(
                   PARTITION BY lower(title), lower(company_name), country_id 
                   ORDER BY created_at DESC
                 ) as rn
          FROM jobs
          WHERE is_active = true
        )
        UPDATE jobs
        SET is_active = false
        WHERE id IN (
          SELECT id FROM duplicates WHERE rn > 1
        )
        RETURNING id;
      `;
      
      const res = await db.execute(query);
      console.log(`[Deduplication] Flagged ${res.length} duplicate jobs as inactive.`);
      return { duplicatesFlagged: res.length };
    });

    return { message: "Deduplication complete", ...result };
  }
);
