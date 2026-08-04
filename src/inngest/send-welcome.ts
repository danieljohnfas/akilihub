import { inngest } from "./client";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { WelcomeEmail } from "@/lib/email/templates";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/users";
import { eq } from "drizzle-orm";
import React from "react";

// Helper function to chunk array for Resend limits
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export const sendWelcomeEmailsJob = inngest.createFunction(
  { id: "send-welcome-emails", triggers: [{ cron: "*/15 * * * *" }] }, // Every 15 minutes
  async ({ step }) => {
    // 1. Find users who haven't received a welcome email
    const newUsers = await step.run("find-new-users", async () => {
      return await db
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
        })
        .from(users)
        .where(eq(users.welcomeEmailSent, false));
    });

    if (newUsers.length === 0) {
      return { skipped: true, reason: "No new users to welcome" };
    }

    // 2. Prepare emails
    const emailPayloads = await step.run("prepare-welcome-emails", async () => {
      const payloads = [];
      for (const user of newUsers) {
        const html = await render(
          React.createElement(WelcomeEmail, {
            name: user.fullName || undefined,
          })
        );

        payloads.push({
          from: "AkiliBrain <hello@akilibrain.com>",
          to: [user.email],
          subject: "Welcome to AkiliBrain \uD83D\uDC4B",
          html,
        });
      }
      return payloads;
    });

    // 3. Send in batches
    await step.run("send-welcome-batched", async () => {
      if (!process.env.RESEND_API_KEY) return { skipped: true };
      const resend = new Resend(process.env.RESEND_API_KEY);

      const chunks = chunkArray(emailPayloads, 100);
      for (const chunk of chunks) {
        await (resend.batch as { send: (emails: typeof chunk) => Promise<unknown> }).send(chunk);
        await new Promise((r) => setTimeout(r, 1000));
      }
    });

    // 4. Mark as sent
    await step.run("mark-welcome-sent", async () => {
      const userIds = newUsers.map((u) => u.id);
      const chunks = chunkArray(userIds, 100);
      
      for (const chunk of chunks) {
        const { inArray } = await import("drizzle-orm");
        await db.update(users).set({ welcomeEmailSent: true }).where(inArray(users.id, chunk));
      }
    });

    return { processed: newUsers.length };
  }
);
