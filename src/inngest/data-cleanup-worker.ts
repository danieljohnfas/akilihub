import { inngest } from "@/inngest/client";
import { db, safeQuery } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema/jobs";
import { tenders } from "@/lib/db/schema/tenders";
import { complianceRequirements as compliance } from "@/lib/db/schema/compliance";
import { dataVerificationLog } from "@/lib/db/schema/admin";
import { eq, isNull, sql } from "drizzle-orm";
import { generateObjectWithFallback } from "@/lib/ai/router";
import { z } from "zod";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");

const REPORT_EMAIL = "danieljohnfassanga@gmail.com";
const ONE_HOUR_MS = 60 * 60 * 1000;
const BATCH_SIZE = 20; // Increased batch size for higher throughput

const ClassificationSchema = z.object({
  module: z.enum(['jobs', 'tenders', 'compliance', 'unknown']).describe("The correct module this data belongs to."),
  reasoning: z.string().describe("Brief explanation of why this belongs in the module."),
});

async function getStats() {
  const [[verified], [jobCount], [tenderCount], [complianceCount]] = await Promise.all([
    safeQuery(db.select({ count: sql<number>`count(*)` }).from(dataVerificationLog)),
    safeQuery(db.select({ count: sql<number>`count(*)` }).from(jobs).leftJoin(dataVerificationLog, eq(jobs.id, dataVerificationLog.recordId)).where(isNull(dataVerificationLog.id))),
    safeQuery(db.select({ count: sql<number>`count(*)` }).from(tenders).leftJoin(dataVerificationLog, eq(tenders.id, dataVerificationLog.recordId)).where(isNull(dataVerificationLog.id))),
    safeQuery(db.select({ count: sql<number>`count(*)` }).from(compliance).leftJoin(dataVerificationLog, eq(compliance.id, dataVerificationLog.recordId)).where(isNull(dataVerificationLog.id))),
  ]);
  return {
    verified: Number(verified?.count ?? 0),
    unverifiedJobs: Number(jobCount?.count ?? 0),
    unverifiedTenders: Number(tenderCount?.count ?? 0),
    unverifiedCompliance: Number(complianceCount?.count ?? 0),
  };
}

async function sendProgressEmail(subject: string, stats: Awaited<ReturnType<typeof getStats>>, extra?: string) {
  const total = stats.unverifiedJobs + stats.unverifiedTenders + stats.unverifiedCompliance;
  await resend.emails.send({
    from: "AkiliBrain Cleanup <noreply@akilibrain.com>",
    to: REPORT_EMAIL,
    subject,
    html: `
      <h2>AkiliBrain Data Verification Report</h2>
      ${extra ? `<p>${extra}</p>` : ""}
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
        <tr><th>Metric</th><th>Count</th></tr>
        <tr><td>✅ Records verified by AI so far</td><td><b>${stats.verified}</b></td></tr>
        <tr><td>📋 Jobs still to verify</td><td>${stats.unverifiedJobs}</td></tr>
        <tr><td>📄 Tenders still to verify</td><td>${stats.unverifiedTenders}</td></tr>
        <tr><td>⚖️ Compliance records still to verify</td><td>${stats.unverifiedCompliance}</td></tr>
        <tr><td>📦 Total remaining</td><td><b>${total}</b></td></tr>
      </table>
      <p style="color:#888;font-size:12px;">The worker continues running until all records are verified. Next update in ~1 hour.</p>
    `,
  });
}

export const dataCleanupOrchestratorJob = inngest.createFunction(
  {
    id: "data-cleanup-orchestrator-v2",
    name: "AI Data Cleanup & Verification Worker",
    retries: 2,
    concurrency: { limit: 1, key: "data-cleanup-singleton-v2" },
    triggers: [{ event: "data.verification.v2.start" }]
  },
  async ({ event, step }) => {
    const startTime: number = event.data.startTime || Date.now();
    const lastEmailTime: number = event.data.lastEmailTime || 0;
    const isFirstRun: boolean = lastEmailTime === 0;

    // ── STEP 1: Send an immediate startup email on the very first invocation ──
    if (isFirstRun) {
      await step.run("send-startup-email", async () => {
        const stats = await getStats();
        await sendProgressEmail(
          "🚀 Data Cleanup Task Started!",
          stats,
          `The AI-powered data verification task has just been started. It will process all ${stats.unverifiedJobs + stats.unverifiedTenders + stats.unverifiedCompliance} records across Jobs, Tenders, and Compliance modules.`
        );
      });
    }

    // ── STEP 2: Fetch one small batch of unverified Jobs ──
    const unverifiedJobs = await step.run("fetch-unverified-jobs", async () => {
      return await safeQuery(
        db.select({
          id: jobs.id,
          title: jobs.title,
          description: jobs.description,
          companyName: jobs.companyName,
          sourceUrl: jobs.sourceUrl,
          countryId: jobs.countryId,
          regionId: jobs.regionId,
          postedDate: jobs.postedDate,
          deadline: jobs.deadline,
        })
        .from(jobs)
        .leftJoin(dataVerificationLog, eq(jobs.id, dataVerificationLog.recordId))
        .where(isNull(dataVerificationLog.id))
        .limit(BATCH_SIZE)
      );
    });

    // ── STEP 3: Fetch one small batch of unverified Tenders (if no jobs) ──
    let unverifiedTenders: any[] = [];
    if (unverifiedJobs.length === 0) {
      unverifiedTenders = await step.run("fetch-unverified-tenders", async () => {
        return await safeQuery(
          db.select({
            id: tenders.id,
            title: tenders.title,
            description: tenders.description,
            contractingAuthority: tenders.contractingAuthority,
            sourceUrl: tenders.sourceUrl,
            countryId: tenders.countryId,
            regionId: tenders.regionId,
            publishedAt: tenders.publishedAt,
            deadline: tenders.deadline,
          })
          .from(tenders)
          .leftJoin(dataVerificationLog, eq(tenders.id, dataVerificationLog.recordId))
          .where(isNull(dataVerificationLog.id))
          .limit(BATCH_SIZE)
        );
      });
    }

    // ── STEP 4: Fetch one small batch of unverified Compliance (if neither) ──
    let unverifiedCompliance: any[] = [];
    if (unverifiedJobs.length === 0 && unverifiedTenders.length === 0) {
      unverifiedCompliance = await step.run("fetch-unverified-compliance", async () => {
        return await safeQuery(
          db.select({
            id: compliance.id,
            title: compliance.title,
            description: compliance.description,
            issuingAuthority: compliance.issuingAuthority,
            sourceUrl: compliance.sourceUrl,
            countryId: compliance.countryId,
          })
          .from(compliance)
          .leftJoin(dataVerificationLog, eq(compliance.id, dataVerificationLog.recordId))
          .where(isNull(dataVerificationLog.id))
          .limit(BATCH_SIZE)
        );
      });
    }

    const totalToProcess = unverifiedJobs.length + unverifiedTenders.length + unverifiedCompliance.length;

    // ── STEP 5: Done! All data verified. ──
    if (totalToProcess === 0) {
      await step.run("send-completion-email", async () => {
        const stats = await getStats();
        await sendProgressEmail(
          "✅ Data Cleanup Task Completed!",
          stats,
          `All records have been verified by AI. The data is now clean and properly categorized.`
        );
      });
      return { message: "Task completed. All records verified." };
    }

    // ── STEP 6: Process each record individually ──
    // Each record is its own step so failures are isolated and don't block others
    let movedCount = 0;
    let rateLimitHit = false;

    // Process Jobs
    for (const job of unverifiedJobs) {
      const result = await step.run(`process-job-${job.id}`, async () => {
        const textToAnalyze = `Title: ${job.title}\nDescription: ${(job.description || '').substring(0, 500)}\nCompany: ${job.companyName}`;
        try {
          const aiResult = await generateObjectWithFallback({
            modelName: "Google Gemini 2.5 Flash",
            schema: ClassificationSchema,
            system: "You are a data quality controller. Classify this record as: 'jobs' (employment listing), 'tenders' (procurement/bid notice), 'compliance' (legal/regulatory notice), or 'unknown'. Be accurate.",
            prompt: textToAnalyze,
          });

          const module = aiResult.object.module;
          let actionTaken = 'none';

          if (module === 'tenders') {
            await db.transaction(async (tx) => {
              await tx.insert(tenders).values({
                title: job.title,
                description: job.description,
                contractingAuthority: job.companyName,
                sourceUrl: job.sourceUrl,
                countryId: job.countryId,
                regionId: job.regionId,
                publishedAt: job.postedDate,
                deadline: job.deadline,
                referenceNo: `MIGRATED-${Date.now()}`,
              } as any).onConflictDoNothing();
              await tx.delete(jobs).where(eq(jobs.id, job.id));
            });
            actionTaken = 'moved';
            movedCount++;
          } else if (module === 'compliance') {
            await db.transaction(async (tx) => {
              await tx.insert(compliance).values({
                title: job.title,
                description: job.description,
                issuingAuthority: job.companyName,
                sourceUrl: job.sourceUrl,
                countryId: job.countryId,
                category: 'sector_specific',
                status: 'active',
              } as any).onConflictDoNothing();
              await tx.delete(jobs).where(eq(jobs.id, job.id));
            });
            actionTaken = 'moved';
            movedCount++;
          }

          await db.insert(dataVerificationLog).values({
            recordId: job.id,
            sourceModule: 'jobs',
            targetModule: module,
            actionTaken,
          });
          return { success: true as boolean, rateLimitHit: false as boolean };
        } catch (e: any) {
          console.error(`AI error for job ${job.id}:`, e?.message);
          return { success: false, rateLimitHit: true };
        }
      });

      if (!result.success && result.rateLimitHit) {
        rateLimitHit = true;
        break;
      }
    }

    // Process Tenders
    if (!rateLimitHit) {
      for (const tender of unverifiedTenders) {
        const result = await step.run(`process-tender-${tender.id}`, async () => {
          const textToAnalyze = `Title: ${tender.title}\nDescription: ${(tender.description || '').substring(0, 500)}\nAuthority: ${tender.contractingAuthority}`;
          try {
            const aiResult = await generateObjectWithFallback({
              modelName: "Google Gemini 2.5 Flash",
              schema: ClassificationSchema,
              system: "You are a data quality controller. Classify this record as: 'jobs' (employment listing), 'tenders' (procurement/bid notice), 'compliance' (legal/regulatory notice), or 'unknown'. Be accurate.",
              prompt: textToAnalyze,
            });

            const module = aiResult.object.module;
            let actionTaken = 'none';

            if (module === 'jobs') {
              await db.transaction(async (tx) => {
                await tx.insert(jobs).values({
                  title: tender.title,
                  description: tender.description || '',
                  companyName: tender.contractingAuthority || 'Unknown',
                  sourceUrl: tender.sourceUrl,
                  countryId: tender.countryId,
                  regionId: tender.regionId,
                  postedDate: tender.publishedAt,
                  deadline: tender.deadline,
                } as any).onConflictDoNothing();
                await tx.delete(tenders).where(eq(tenders.id, tender.id));
              });
              actionTaken = 'moved';
              movedCount++;
            } else if (module === 'compliance') {
              await db.transaction(async (tx) => {
                await tx.insert(compliance).values({
                  title: tender.title,
                  description: tender.description,
                  issuingAuthority: tender.contractingAuthority,
                  sourceUrl: tender.sourceUrl,
                  countryId: tender.countryId,
                  category: 'sector_specific',
                  status: 'active',
                } as any).onConflictDoNothing();
                await tx.delete(tenders).where(eq(tenders.id, tender.id));
              });
              actionTaken = 'moved';
              movedCount++;
            }

            await db.insert(dataVerificationLog).values({
              recordId: tender.id,
              sourceModule: 'tenders',
              targetModule: module,
              actionTaken,
            });
            return { success: true as boolean, rateLimitHit: false as boolean };
          } catch (e: any) {
            console.error(`AI error for tender ${tender.id}:`, e?.message);
            return { success: false, rateLimitHit: true };
          }
        });

        if (!result.success && result.rateLimitHit) {
          rateLimitHit = true;
          break;
        }
      }
    }

    // Process Compliance
    if (!rateLimitHit) {
      for (const comp of unverifiedCompliance) {
        const result = await step.run(`process-compliance-${comp.id}`, async () => {
          const textToAnalyze = `Title: ${comp.title}\nDescription: ${(comp.description || '').substring(0, 500)}\nAuthority: ${comp.issuingAuthority}`;
          try {
            const aiResult = await generateObjectWithFallback({
              modelName: "Google Gemini 2.5 Flash",
              schema: ClassificationSchema,
              system: "You are a data quality controller. Classify this record as: 'jobs' (employment listing), 'tenders' (procurement/bid notice), 'compliance' (legal/regulatory notice), or 'unknown'. Be accurate.",
              prompt: textToAnalyze,
            });

            const module = aiResult.object.module;
            let actionTaken = 'none';

            if (module === 'jobs') {
              await db.transaction(async (tx) => {
                await tx.insert(jobs).values({
                  title: comp.title,
                  description: comp.description || '',
                  companyName: comp.issuingAuthority || 'Unknown',
                  sourceUrl: comp.sourceUrl,
                  countryId: comp.countryId,
                } as any).onConflictDoNothing();
                await tx.delete(compliance).where(eq(compliance.id, comp.id));
              });
              actionTaken = 'moved';
              movedCount++;
            } else if (module === 'tenders') {
              await db.transaction(async (tx) => {
                await tx.insert(tenders).values({
                  title: comp.title,
                  description: comp.description,
                  contractingAuthority: comp.issuingAuthority,
                  sourceUrl: comp.sourceUrl,
                  countryId: comp.countryId,
                  referenceNo: `MIGRATED-${Date.now()}`,
                } as any).onConflictDoNothing();
                await tx.delete(compliance).where(eq(compliance.id, comp.id));
              });
              actionTaken = 'moved';
              movedCount++;
            }

            await db.insert(dataVerificationLog).values({
              recordId: comp.id,
              sourceModule: 'compliance',
              targetModule: module,
              actionTaken,
            });
            return { success: true as boolean, rateLimitHit: false as boolean };
          } catch (e: any) {
            console.error(`AI error for compliance ${comp.id}:`, e?.message);
            return { success: false, rateLimitHit: true };
          }
        });

        if (!result.success && result.rateLimitHit) {
          rateLimitHit = true;
          break;
        }
      }
    }

    // ── STEP 7: Rate limit cooldown if needed ──
    if (rateLimitHit) {
      await step.sleep("rate-limit-cooldown", "5m");
    }

    // ── STEP 8: Send hourly progress email ──
    const now = Date.now();
    let updatedLastEmailTime = lastEmailTime || startTime;

    if (now - updatedLastEmailTime >= ONE_HOUR_MS) {
      await step.run("send-hourly-email", async () => {
        const stats = await getStats();
        const elapsedHours = ((now - startTime) / ONE_HOUR_MS).toFixed(1);
        await sendProgressEmail(
          `⏳ Data Cleanup Progress — ${elapsedHours}h elapsed`,
          stats,
          `Hourly progress update. In the latest batch, ${movedCount} records were re-categorized to their correct module.`
        );
      });
      updatedLastEmailTime = now;
    }

    // ── STEP 9: Schedule the next batch ──
    await step.sendEvent("trigger-next-batch", {
      name: "data.verification.v2.start",
      data: {
        startTime,
        lastEmailTime: updatedLastEmailTime,
      },
    });

    return { processed: totalToProcess, moved: movedCount, rateLimitHit };
  }
);
