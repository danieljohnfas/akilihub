import { inngest } from "./client";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { TenderAlertEmail } from "@/lib/email/templates";
import { db } from "@/lib/db/client";
import { tenders } from "@/lib/db/schema/tenders";
import { countries } from "@/lib/db/schema/shared";
import { desc, eq } from "drizzle-orm";
import React from "react";

export const sendTenderAlertsJob = inngest.createFunction(
  { id: "send-tender-alerts", triggers: [{ event: "tenders.new" }] },
  async ({ event, step }) => {
    const { count, source } = event.data;

    const recentTenders = await step.run("fetch-recent-tenders", async () => {
      // Fetch the actual tenders that were just inserted to include in the email
      const rows = await db
        .select({
          id: tenders.id,
          title: tenders.title,
          authority: tenders.contractingAuthority,
          country: countries.name,
          deadline: tenders.deadline,
          budget: tenders.budget,
        })
        .from(tenders)
        .leftJoin(countries, eq(tenders.countryId, countries.id))
        .orderBy(desc(tenders.createdAt))
        .limit(Math.min(count, 10)); // Top 10 max in email
        
      return rows;
    });

    await step.run("send-email-alerts", async () => {
      if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY missing. Skipping email send.");
        return { skipped: true };
      }

      const resend = new Resend(process.env.RESEND_API_KEY);
      const adminEmail = process.env.ADMIN_EMAIL || "danieljohnfassanga@gmail.com";

      const formattedTenders = recentTenders.map(t => ({
        id: t.id,
        title: t.title,
        authority: t.authority,
        country: t.country ?? "Unknown",
        deadline: t.deadline ? new Date(t.deadline).toDateString() : "N/A",
        budget: t.budget ?? undefined,
      }));

      // Render the React Email to HTML string
      const htmlOutput = await render(
        React.createElement(TenderAlertEmail, {
          name: "Daniel",
          tenders: formattedTenders,
          keywords: [source], // using source as a keyword for admin context
        })
      );

      await resend.emails.send({
        from: "AkiliBrain Alerts <alerts@akilibrain.com>",
        to: [adminEmail],
        subject: `[AkiliBrain] ${count} new tenders from ${source}`,
        html: htmlOutput,
      });
      return { success: true };
    });

    return { event: event.name, processed: count };
  }
);