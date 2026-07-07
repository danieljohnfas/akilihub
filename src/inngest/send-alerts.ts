import { inngest } from "./client";
import { Resend } from "resend";

export const sendTenderAlertsJob = inngest.createFunction(
  { id: "send-tender-alerts", triggers: [{ event: "tenders.new" }] },
  async ({ event, step }) => {
    const { count, source } = event.data;

    await step.run("send-email-alerts", async () => {
      if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY missing. Skipping email send.");
        return { skipped: true };
      }

      const resend = new Resend(process.env.RESEND_API_KEY);
      const adminEmail = process.env.ADMIN_EMAIL || "danieljohnfassanga@gmail.com";

      await resend.emails.send({
        from: "AkiliBrain <alerts@akilibrain.com>",
        to: [adminEmail],
        subject: `Alert: ${count} new tenders from ${source}`,
        html: `
          <h2>New Tenders Found!</h2>
          <p>Our automated systems just ingested <strong>${count}</strong> new tenders from <strong>${source}</strong>.</p>
          <a href="https://akilibrain.com/tenders">View Tenders</a>
        `
      });
      return { success: true };
    });

    return { event: event.name, processed: count };
  }
);