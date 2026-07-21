import { inngest } from "./client";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { TenderAlertEmail, DailyDigestEmail, WeeklyNewsletterEmail } from "@/lib/email/templates";
import { db } from "@/lib/db/client";
import { tenders } from "@/lib/db/schema/tenders";
import { jobs } from "@/lib/db/schema/jobs";
import { users, userAlerts } from "@/lib/db/schema/users";
import { countries } from "@/lib/db/schema/shared";
import { desc, eq, sql, inArray } from "drizzle-orm";
import React from "react";

// Helper function to chunk array for Resend limits
function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "danieljohnfassanga@gmail.com";

export const sendTenderAlertsJob = inngest.createFunction(
  { id: "send-tender-alerts", triggers: [{ event: "tenders.new" }] },
  async ({ event, step }) => {
    const { count, source } = event.data;

    const recentTenders = await step.run("fetch-recent-tenders", async () => {
      return await db
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
        .limit(Math.min(count, 10));
    });

    await step.run("send-email-alerts", async () => {
      if (!process.env.RESEND_API_KEY) return { skipped: true };
      const resend = new Resend(process.env.RESEND_API_KEY);

      const formattedTenders = recentTenders.map(t => ({
        id: t.id,
        title: t.title,
        authority: t.authority,
        country: t.country ?? "Unknown",
        deadline: t.deadline ? new Date(t.deadline).toDateString() : "N/A",
        budget: t.budget ?? undefined,
      }));

      const htmlOutput = await render(
        React.createElement(TenderAlertEmail, {
          name: "Daniel",
          tenders: formattedTenders,
          keywords: [source],
        })
      );

      await resend.emails.send({
        from: "AkiliBrain Alerts <alerts@akilibrain.com>",
        to: [ADMIN_EMAIL],
        subject: `[AkiliBrain] ${count} new tenders from ${source}`,
        html: htmlOutput,
      });
      return { success: true };
    });

    return { event: event.name, processed: count };
  }
);

export const sendDailyDigestJob = inngest.createFunction(
  { id: "send-daily-digest" },
  { cron: "0 8 * * *" }, // Run at 8:00 AM daily
  async ({ step }) => {
    // 1. Fetch active users subscribed to daily digests
    const subscribers = await step.run("fetch-subscribers", async () => {
      const activeAlerts = await db.select()
        .from(userAlerts)
        .leftJoin(users, eq(userAlerts.userId, users.id))
        .where(eq(userAlerts.frequency, 'daily'));
        
      // For now, in unverified domain mode, we only send to Admin.
      // But we simulate the logic for production readiness.
      return activeAlerts.filter(a => a.users && a.users.email === ADMIN_EMAIL);
    });

    if (subscribers.length === 0) return { skipped: true, reason: "No subscribers" };

    // 2. Fetch the latest items across modules
    const newItems = await step.run("fetch-new-items", async () => {
      const latestTenders = await db.select().from(tenders).orderBy(desc(tenders.createdAt)).limit(10);
      const latestJobs = await db.select().from(jobs).orderBy(desc(jobs.createdAt)).limit(10);
      
      return {
        tenders: latestTenders.map(t => ({
          id: t.id, title: t.title, subtitle: t.contractingAuthority || "Unknown Authority", url: `https://akilibrain.com/tenders/${t.id}`
        })),
        jobs: latestJobs.map(j => ({
          id: j.id, title: j.title, subtitle: j.company || "Unknown Company", url: `https://akilibrain.com/jobs/${j.id}`
        }))
      };
    });

    // 3. Render and Send Emails using Chunking
    const emailPayloads = await step.run("prepare-emails", async () => {
      const payloads = [];
      for (const sub of subscribers) {
        if (!sub.users) continue;
        const html = await render(
          React.createElement(DailyDigestEmail, {
            name: sub.users.fullName || "User",
            items: [...newItems.tenders, ...newItems.jobs].slice(0, 15),
          })
        );
        payloads.push({
          from: "AkiliBrain Alerts <alerts@akilibrain.com>",
          to: [sub.users.email],
          subject: "📬 Your AkiliBrain Daily Intelligence Digest",
          html,
        });
      }
      return payloads;
    });

    await step.run("send-emails-batched", async () => {
      if (!process.env.RESEND_API_KEY) return { skipped: true };
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      const chunks = chunkArray(emailPayloads, 100);
      for (const chunk of chunks) {
        // @ts-ignore - Resend batch API accepts array of email objects
        await resend.batch.send(chunk);
        // Rate limit: 2 per second max, safe delay
        await new Promise(r => setTimeout(r, 1000));
      }
      return { batches: chunks.length, total: emailPayloads.length };
    });

    return { processed: emailPayloads.length };
  }
);

export const sendWeeklyNewsletterJob = inngest.createFunction(
  { id: "send-weekly-newsletter" },
  { cron: "0 9 * * 1" }, // Run at 9:00 AM on Mondays
  async ({ step }) => {
    // 1. Fetch all active users
    const allUsers = await step.run("fetch-all-users", async () => {
      const rows = await db.select().from(users);
      // Filter for unverified domain test mode
      return rows.filter(u => u.email === ADMIN_EMAIL);
    });

    if (allUsers.length === 0) return { skipped: true, reason: "No users" };

    // 2. Fetch Weekly Highlights
    const highlights = await step.run("fetch-weekly-highlights", async () => {
      const topTenders = await db.select().from(tenders).orderBy(desc(tenders.budget)).limit(5);
      const topJobs = await db.select().from(jobs).orderBy(desc(jobs.createdAt)).limit(5);
      
      return {
        tenders: topTenders.map(t => ({
          id: t.id, title: t.title, subtitle: `Budget: ${t.budget || "N/A"}`, url: `https://akilibrain.com/tenders/${t.id}`
        })),
        jobs: topJobs.map(j => ({
          id: j.id, title: j.title, subtitle: j.company || "Unknown Company", url: `https://akilibrain.com/jobs/${j.id}`
        }))
      };
    });

    // 3. Render and Send Emails using Chunking
    const emailPayloads = await step.run("prepare-weekly-emails", async () => {
      const payloads = [];
      for (const user of allUsers) {
        const html = await render(
          React.createElement(WeeklyNewsletterEmail, {
            name: user.fullName || "User",
            topTenders: highlights.tenders,
            topJobs: highlights.jobs,
          })
        );
        payloads.push({
          from: "AkiliBrain Newsletter <newsletter@akilibrain.com>",
          to: [user.email],
          subject: "🌍 The AkiliBrain Weekly Intelligence Recap",
          html,
        });
      }
      return payloads;
    });

    await step.run("send-weekly-batched", async () => {
      if (!process.env.RESEND_API_KEY) return { skipped: true };
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      const chunks = chunkArray(emailPayloads, 100);
      for (const chunk of chunks) {
        // @ts-ignore
        await resend.batch.send(chunk);
        await new Promise(r => setTimeout(r, 1000));
      }
      return { batches: chunks.length, total: emailPayloads.length };
    });

    return { processed: emailPayloads.length };
  }
);