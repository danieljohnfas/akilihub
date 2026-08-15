import { inngest } from "./client";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { TenderAlertEmail, DailyDigestEmail, WeeklyNewsletterEmail, ReengagementEmail } from "@/lib/email/templates";
import { db } from "@/lib/db/client";
import { tenders } from "@/lib/db/schema/tenders";
import { jobs } from "@/lib/db/schema/jobs";
import { users, userAlerts, bookmarks } from "@/lib/db/schema/users";
import { countries } from "@/lib/db/schema/shared";
import { desc, eq, inArray, and, isNotNull, or, isNull, gte } from "drizzle-orm";
import React from "react";

// Helper function to chunk array for Resend limits
function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
if (!ADMIN_EMAIL) {
  console.warn('[send-alerts] ADMIN_EMAIL env var is not set. Alert emails will be skipped.');
}

export const sendTenderAlertsJob = inngest.createFunction(
  { id: "send-tender-alerts", triggers: [{ event: "tenders.new" }] },
  async ({ event, step }) => {
    const { count, source } = event.data;

    const recentTenders = await step.run("fetch-recent-tenders", async () => {
      const now = new Date();
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
        .where(
          and(
            eq(tenders.status, "open"),
            or(isNull(tenders.deadline), gte(tenders.deadline, now))
          )
        )
        .orderBy(desc(tenders.createdAt))
        .limit(Math.min(count, 10));
    });

    await step.run("send-email-alerts", async () => {
      if (!process.env.RESEND_API_KEY || !ADMIN_EMAIL) return { skipped: true };
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
        to: [ADMIN_EMAIL!],
        subject: `[AkiliBrain] ${count} new tenders from ${source}`,
        html: htmlOutput,
      });
      return { success: true };
    });

    return { event: event.name, processed: count };
  }
);

export const sendDailyDigestJob = inngest.createFunction(
  { id: "send-daily-digest", triggers: [{ cron: "0 8 * * *" }] }, // Run at 8:00 AM daily
  async ({ step }) => {
    // 1. Fetch active users subscribed to daily digests
    const subscribers = await step.run("fetch-subscribers", async () => {
      const activeAlerts = await db.select()
        .from(userAlerts)
        .leftJoin(users, eq(userAlerts.userId, users.id))
        .where(eq(userAlerts.frequency, 'daily'));
        
      return activeAlerts.filter(a => a.users);
    });

    if (subscribers.length === 0) return { skipped: true, reason: "No subscribers" };

    // 2. Fetch the latest items across modules (strictly active/open and within 30 days)
    const newItems = await step.run("fetch-new-items", async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const latestTenders = await db
        .select()
        .from(tenders)
        .where(
          and(
            eq(tenders.status, "open"),
            or(isNull(tenders.deadline), gte(tenders.deadline, now)),
            gte(tenders.createdAt, thirtyDaysAgo)
          )
        )
        .orderBy(desc(tenders.createdAt))
        .limit(10);

      const latestJobs = await db
        .select()
        .from(jobs)
        .where(
          and(
            eq(jobs.isActive, true),
            or(isNull(jobs.deadline), gte(jobs.deadline, now)),
            gte(jobs.createdAt, thirtyDaysAgo)
          )
        )
        .orderBy(desc(jobs.createdAt))
        .limit(10);
      
      return {
        tenders: latestTenders.map(t => ({
          id: t.id, title: t.title, subtitle: t.contractingAuthority || "Unknown Authority", url: `https://akilibrain.com/tenders/${t.id}`
        })),
        jobs: latestJobs.map(j => ({
          id: j.id, title: j.title, subtitle: j.companyName || "Unknown Company", url: `https://akilibrain.com/jobs/${j.id}`
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
        await (resend.batch as { send: (emails: typeof chunk) => Promise<unknown> }).send(chunk);
        // Rate limit: 2 per second max, safe delay
        await new Promise(r => setTimeout(r, 1000));
      }
      return { batches: chunks.length, total: emailPayloads.length };
    });

    return { processed: emailPayloads.length };
  }
);

export const sendWeeklyNewsletterJob = inngest.createFunction(
  { id: "send-weekly-newsletter", triggers: [{ cron: "0 9 * * 1" }] }, // Run at 9:00 AM on Mondays
  async ({ step }) => {
    // 1. Fetch all active users
    const allUsers = await step.run("fetch-all-users", async () => {
      return await db.select().from(users);
    });

    if (allUsers.length === 0) return { skipped: true, reason: "No users" };

    // 2. Fetch Weekly Highlights (strictly active/open)
    const highlights = await step.run("fetch-weekly-highlights", async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const topTenders = await db
        .select()
        .from(tenders)
        .where(
          and(
            eq(tenders.status, "open"),
            or(isNull(tenders.deadline), gte(tenders.deadline, now)),
            gte(tenders.createdAt, thirtyDaysAgo)
          )
        )
        .orderBy(desc(tenders.budget))
        .limit(5);

      const topJobs = await db
        .select()
        .from(jobs)
        .where(
          and(
            eq(jobs.isActive, true),
            or(isNull(jobs.deadline), gte(jobs.deadline, now)),
            gte(jobs.createdAt, thirtyDaysAgo)
          )
        )
        .orderBy(desc(jobs.createdAt))
        .limit(5);
      
      return {
        tenders: topTenders.map(t => ({
          id: t.id, title: t.title, subtitle: `Budget: ${t.budget || "N/A"}`, url: `https://akilibrain.com/tenders/${t.id}`
        })),
        jobs: topJobs.map(j => ({
          id: j.id, title: j.title, subtitle: j.companyName || "Unknown Company", url: `https://akilibrain.com/jobs/${j.id}`
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
        await (resend.batch as { send: (emails: typeof chunk) => Promise<unknown> }).send(chunk);
        await new Promise(r => setTimeout(r, 1000));
      }
      return { batches: chunks.length, total: emailPayloads.length };
    });

    return { processed: emailPayloads.length };
  }
);

export const sendReengagementAlertsJob = inngest.createFunction(
  { id: "send-reengagement-alerts", triggers: [{ cron: "0 10 * * *" }] }, // 10:00 AM daily
  async ({ step }) => {
    // 1. Find users who were last seen exactly 7 days ago (±12h window) and have not returned
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const windowStart = new Date(sevenDaysAgo.getTime() - 12 * 60 * 60 * 1000);
    const windowEnd = new Date(sevenDaysAgo.getTime() + 12 * 60 * 60 * 1000);

    const inactiveUsers = await step.run("find-inactive-users", async () => {
      const { gte, lte } = await import("drizzle-orm");
      return await db
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          lastSeenAt: users.lastSeenAt,
          lastSearchQuery: users.lastSearchQuery,
          countryId: users.countryId,
        })
        .from(users)
        .where(
          and(
            isNotNull(users.lastSeenAt),
            eq(users.emailUpdates, true),
            gte(users.lastSeenAt, windowStart),
            lte(users.lastSeenAt, windowEnd)
          )
        );
    });

    if (inactiveUsers.length === 0) {
      return { skipped: true, reason: "No inactive users in the 7-day window" };
    }

    // 2. Fetch recent recommendations (strictly open/active pool for filtering)
    const pool = await step.run("fetch-recommendation-pool", async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [latestTenders, latestJobs] = await Promise.all([
        db
          .select({ id: tenders.id, title: tenders.title, authority: tenders.contractingAuthority, countryId: tenders.countryId })
          .from(tenders)
          .where(
            and(
              eq(tenders.status, "open"),
              or(isNull(tenders.deadline), gte(tenders.deadline, now)),
              gte(tenders.createdAt, thirtyDaysAgo)
            )
          )
          .orderBy(desc(tenders.createdAt))
          .limit(50),
        db
          .select({ id: jobs.id, title: jobs.title, company: jobs.companyName, countryId: jobs.countryId })
          .from(jobs)
          .where(
            and(
              eq(jobs.isActive, true),
              or(isNull(jobs.deadline), gte(jobs.deadline, now)),
              gte(jobs.createdAt, thirtyDaysAgo)
            )
          )
          .orderBy(desc(jobs.createdAt))
          .limit(50),
      ]);
      return { latestTenders, latestJobs };
    });

    // 3. Prepare and send personalised emails
    const emailPayloads = await step.run("prepare-reengagement-emails", async () => {
      const payloads = [];
      const userIds = inactiveUsers.map((u) => u.id);

      const [allAlerts, allBookmarks] = await Promise.all([
        db.select().from(userAlerts).where(inArray(userAlerts.userId, userIds)),
        db.select().from(bookmarks).where(inArray(bookmarks.userId, userIds)),
      ]);

      const alertsByUser = allAlerts.reduce((acc, alert) => {
        if (!acc[alert.userId]) acc[alert.userId] = [];
        acc[alert.userId].push(alert);
        return acc;
      }, {} as Record<string, typeof allAlerts>);

      const bookmarksByUser = allBookmarks.reduce((acc, bm) => {
        if (!acc[bm.userId]) acc[bm.userId] = [];
        acc[bm.userId].push(bm);
        return acc;
      }, {} as Record<string, typeof allBookmarks>);

      for (const user of inactiveUsers) {
        const daysSince = Math.round(
          (Date.now() - new Date(user.lastSeenAt!).getTime()) / (24 * 60 * 60 * 1000)
        );

        let tendersRecs: typeof pool.latestTenders = [];
        let jobsRecs: typeof pool.latestJobs = [];

        // Priority 1: Last Search Query
        if (user.lastSearchQuery) {
          const keyword = user.lastSearchQuery.replace(/^\[(.*?)\]\s*/, "").toLowerCase();
          tendersRecs = pool.latestTenders.filter((t) => t.title.toLowerCase().includes(keyword));
          jobsRecs = pool.latestJobs.filter((j) => j.title.toLowerCase().includes(keyword));
        }
        // Priority 2: User Alerts
        else if (alertsByUser[user.id] && alertsByUser[user.id].length > 0) {
          const uAlerts = alertsByUser[user.id];
          const tenderAlerts = uAlerts.filter((a) => a.module === "tenders");
          const jobAlerts = uAlerts.filter((a) => a.module === "jobs");

          if (tenderAlerts.length > 0) {
            tendersRecs = pool.latestTenders.filter((t) => {
              return tenderAlerts.some((alert) => {
                const keywordMatch =
                  !alert.keywords ||
                  alert.keywords.length === 0 ||
                  alert.keywords.some((k) => t.title.toLowerCase().includes(k.toLowerCase()));
                const countryMatch = !alert.countryId || alert.countryId === t.countryId;
                return keywordMatch && countryMatch;
              });
            });
          } else if (user.countryId) {
            tendersRecs = pool.latestTenders.filter((t) => t.countryId === user.countryId);
          }

          if (jobAlerts.length > 0) {
            jobsRecs = pool.latestJobs.filter((j) => {
              return jobAlerts.some((alert) => {
                const keywordMatch =
                  !alert.keywords ||
                  alert.keywords.length === 0 ||
                  alert.keywords.some((k) => j.title.toLowerCase().includes(k.toLowerCase()));
                const countryMatch = !alert.countryId || alert.countryId === j.countryId;
                return keywordMatch && countryMatch;
              });
            });
          } else if (user.countryId) {
            jobsRecs = pool.latestJobs.filter((j) => j.countryId === user.countryId);
          }
        }
        // Priority 3: Bookmarks
        else if (bookmarksByUser[user.id] && bookmarksByUser[user.id].length > 0) {
          const bms = bookmarksByUser[user.id];
          const hasTenderBms = bms.some((b) => b.itemType === "tender");
          const hasJobBms = bms.some((b) => b.itemType === "job");

          if (hasTenderBms) tendersRecs = pool.latestTenders;
          if (hasJobBms) jobsRecs = pool.latestJobs;
        }
        // Priority 4: User Country
        else if (user.countryId) {
          tendersRecs = pool.latestTenders.filter((t) => t.countryId === user.countryId);
          jobsRecs = pool.latestJobs.filter((j) => j.countryId === user.countryId);
        }

        // Fallback: Latest generic items
        const finalTenders = tendersRecs.length > 0 ? tendersRecs.slice(0, 3) : pool.latestTenders.slice(0, 3);
        const finalJobs = jobsRecs.length > 0 ? jobsRecs.slice(0, 2) : pool.latestJobs.slice(0, 2);

        const recommendations = [
          ...finalTenders.map((t) => ({
            id: t.id,
            title: t.title,
            subtitle: t.authority || "Government Tender",
            url: `https://akilibrain.com/tenders/${t.id}?utm_source=akilibrain&utm_medium=email&utm_campaign=reengagement`,
            type: "tender" as const,
          })),
          ...finalJobs.map((j) => ({
            id: j.id,
            title: j.title,
            subtitle: j.company || "East Africa",
            url: `https://akilibrain.com/jobs/${j.id}?utm_source=akilibrain&utm_medium=email&utm_campaign=reengagement`,
            type: "job" as const,
          })),
        ];

        if (recommendations.length === 0) continue;

        const html = await render(
          React.createElement(ReengagementEmail, {
            name: user.fullName || undefined,
            lastSearchQuery: user.lastSearchQuery || undefined,
            recommendations,
            daysSinceLastSeen: daysSince,
            userId: user.id,
          })
        );

        payloads.push({
          from: "AkiliBrain Opportunities <opportunities@akilibrain.com>",
          to: [user.email],
          subject: `👋 ${user.fullName ? user.fullName.split(" ")[0] + ", we" : "We"} miss you — fresh opportunities await`,
          html,
        });
      }

      return payloads;
    });

    if (emailPayloads.length === 0) {
      return { skipped: true, reason: "No emails to send after filtering" };
    }

    // 4. Send in batches
    await step.run("send-reengagement-batched", async () => {
      if (!process.env.RESEND_API_KEY) return { skipped: true };
      const resend = new Resend(process.env.RESEND_API_KEY);

      const chunks = chunkArray(emailPayloads, 100);
      for (const chunk of chunks) {
        await (resend.batch as { send: (emails: typeof chunk) => Promise<unknown> }).send(chunk);
        await new Promise((r) => setTimeout(r, 1000));
      }
      return { batches: chunks.length, total: emailPayloads.length };
    });

    return { processed: emailPayloads.length };
  }
);