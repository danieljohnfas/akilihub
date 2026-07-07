import { inngest } from "./client";
import { db } from "@/lib/db/client";
import { tenders } from "@/lib/db/schema/tenders";
import { complianceRequirements } from "@/lib/db/schema/compliance";
import { jobs } from "@/lib/db/schema/jobs";
import { gte } from "drizzle-orm";
import { Resend } from "resend";


export const checkDataStatusJob = inngest.createFunction(
  {
    id: "check-daily-data-status",
    name: "🛡️ Check Daily Data Status",
    triggers: [{ cron: "50 23 * * *" }], // 23:50 UTC every day
  },
  async ({ step }) => {
    const adminEmail = process.env.ADMIN_EMAIL || "danieljohnfassanga@gmail.com";

    // Start of today UTC
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const checkData = await step.run("count-today-inserts", async () => {
      // Drizzle count query approach
      const tendersCount = await db.$count(tenders, gte(tenders.createdAt, startOfToday));
      const complianceCount = await db.$count(complianceRequirements, gte(complianceRequirements.createdAt, startOfToday));
      const jobsCount = await db.$count(jobs, gte(jobs.createdAt, startOfToday));

      return { tendersCount, complianceCount, jobsCount };
    });

    const failedServices: string[] = [];
    if (checkData.tendersCount === 0) failedServices.push("Tenders");
    if (checkData.complianceCount === 0) failedServices.push("Compliance");
    if (checkData.jobsCount === 0) failedServices.push("Jobs");

    if (failedServices.length > 0) {
      await step.run("send-starvation-alert", async () => {
        if (!process.env.RESEND_API_KEY) {
          console.warn("RESEND_API_KEY missing. Skipping email send.");
          return;
        }

        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "AkiliBrain Alerts <alerts@akilibrain.com>",
          to: [adminEmail],
          subject: `🚨 Data Starvation Alert: ${failedServices.join(", ")}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2 style="color: #d32f2f;">Data Starvation Alert</h2>
              <p>The following services failed to scrape any new data today:</p>
              <ul>
                ${failedServices.map(s => `<li><strong>${s}</strong> (0 records inserted today)</li>`).join("")}
              </ul>
              <p>Please check the Vercel/Inngest logs to ensure the AI broad search engines are not hitting rate limits or encountering layout changes.</p>
            </div>
          `
        });
      });

      return { message: `Alerted admin. Failed services: ${failedServices.join(", ")}` };
    }

    return { message: "All services successfully ingested data today." };
  }
);
