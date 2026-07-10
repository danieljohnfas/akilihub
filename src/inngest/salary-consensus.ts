import { inngest } from "./client";
import { db } from "@/lib/db/client";
import { salarySubmissions } from "@/lib/db/schema/salaries";
import { sql, eq, and, not } from "drizzle-orm";

/**
 * Strategy 2: Consensus Clustering
 * Runs nightly at 02:00 UTC. Finds clusters of 3+ independent submissions for
 * the same role (job title) + country + experience level where all salaries
 * fall within ±30% of the cluster median. Auto-verifies matching entries.
 *
 * This grows stronger as the dataset scales — no AI cost, pure statistics.
 */
export const salaryConsensusVerificationJob = inngest.createFunction(
  {
    id: "salary-consensus-verification",
    name: "💰 Salary Consensus Verification",
    triggers: [{ cron: "0 2 * * *" }], // 02:00 UTC daily
  },
  async ({ step }) => {
    const verifiedCount = await step.run("find-and-verify-consensus-clusters", async () => {
      // Find clusters: same job_title (case-insensitive) + country + experience level
      // with >= 3 unverified submissions
      const clusters = await db.execute(sql`
        SELECT
          LOWER(job_title) AS normalized_title,
          country_id,
          experience_level,
          COUNT(*) AS submission_count,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gross_monthly_salary::numeric) AS median_salary,
          ARRAY_AGG(id) AS ids,
          ARRAY_AGG(gross_monthly_salary::numeric) AS salaries
        FROM salary_submissions
        WHERE is_verified = false
        GROUP BY LOWER(job_title), country_id, experience_level
        HAVING COUNT(*) >= 3
      `);

      let totalVerified = 0;

      for (const cluster of clusters as any[]) {
        const median = Number(cluster.median_salary);
        const lowerBound = median * 0.7;  // -30%
        const upperBound = median * 1.3;  // +30%

        const ids: string[] = cluster.ids;
        const salaries: number[] = cluster.salaries.map(Number);

        // Only verify submissions whose salary falls within ±30% of the median
        const idsToVerify = ids.filter((_, i) => {
          const salary = salaries[i];
          return salary >= lowerBound && salary <= upperBound;
        });

        // Need at least 3 within range to count as consensus
        if (idsToVerify.length < 3) continue;

        // Bulk update
        for (const id of idsToVerify) {
          await db
            .update(salarySubmissions)
            .set({ isVerified: true })
            .where(and(eq(salarySubmissions.id, id), not(salarySubmissions.isVerified)));
        }

        totalVerified += idsToVerify.length;
        console.log(
          `[consensus] Verified ${idsToVerify.length} entries for "${cluster.normalized_title}" ` +
          `in country ${cluster.country_id} (${cluster.experience_level}), median: ${median}`
        );
      }

      return totalVerified;
    });

    return {
      message: `Consensus verification complete. ${verifiedCount} salary entries auto-verified.`,
    };
  }
);
