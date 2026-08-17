import { inngest } from "@/inngest/client";
import { db, safeQuery } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema/jobs";
import { tenders } from "@/lib/db/schema/tenders";
import { compliance } from "@/lib/db/schema/compliance";
import { dataVerificationLog } from "@/lib/db/schema/admin";
import { eq, isNull, inArray, sql } from "drizzle-orm";
import { generateObjectWithFallback } from "@/lib/ai/router";
import { z } from "zod";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const ClassificationSchema = z.object({
  module: z.enum(['jobs', 'tenders', 'compliance', 'unknown']).describe("The correct module this data belongs to."),
  reasoning: z.string().describe("Brief explanation of why this belongs in the module."),
});

// A long running step-function worker that processes batches until everything is clean
export const dataCleanupOrchestratorJob = inngest.createFunction(
  {
    id: "data-cleanup-orchestrator",
    name: "AI Data Cleanup & Verification Worker",
    // Run up to 5 minutes on Vercel
    executionEnvironment: "edge", 
    retries: 3
  },
  { event: "data.verification.start" },
  async ({ event, step }) => {
    const batchSize = event.data.batchSize || 10;
    const startTime = event.data.startTime || Date.now();

    // 1. Fetch unverified Jobs
    const unverifiedJobs = await step.run("fetch-unverified-jobs", async () => {
      // Find jobs that have NOT been logged in dataVerificationLog
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
        .limit(batchSize)
      );
    });

    // 2. Fetch unverified Tenders (if no jobs found, move to tenders)
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
          .limit(batchSize)
        );
      });
    }

    // 3. Fetch unverified Compliance (if no tenders or jobs found)
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
          .limit(batchSize)
        );
      });
    }

    const totalToProcess = unverifiedJobs.length + unverifiedTenders.length + unverifiedCompliance.length;

    // If completely empty, we are done!
    if (totalToProcess === 0) {
      await step.run("send-completion-email", async () => {
        await resend.emails.send({
          from: "AkiliBrain Cleanup <noreply@akilibrain.com>",
          to: "danieljohnfassanga@gmail.com",
          subject: "✅ Data Cleanup Task Completed!",
          html: `<p>The massive online data verification task has successfully completed. All records across Jobs, Tenders, and Compliance have been verified by AI and re-categorized where necessary.</p>`,
        });
      });
      return { message: "Task completed. No more unverified records." };
    }

    // 4. Process the batch using AI
    let movedCount = 0;
    let hitRateLimit = false;
    
    await step.run("process-batch-via-ai", async () => {
      // Process Jobs
      for (const job of unverifiedJobs) {
        const textToAnalyze = `Title: ${job.title}\nDescription: ${job.description || ''}\nCompany: ${job.companyName}`;
        
        try {
          const aiResult = await generateObjectWithFallback({
            modelName: "Google Gemini 2.5 Flash", // Reliable fallback
            schema: ClassificationSchema,
            system: "You are a data cleaner. Categorize the following text as a job posting, a tender/procurement notice, or a compliance/legal notice. Be extremely accurate.",
            prompt: textToAnalyze,
          });

          const module = aiResult.object.module;
          let actionTaken = 'none';

          if (module === 'tenders') {
            // MOVE JOB TO TENDERS
            await db.transaction(async (tx) => {
              // Insert to tenders
              await tx.insert(tenders).values({
                title: job.title,
                description: job.description,
                contractingAuthority: job.companyName,
                sourceUrl: job.sourceUrl,
                countryId: job.countryId,
                regionId: job.regionId,
                publishedAt: job.postedDate,
                deadline: job.deadline,
                referenceNo: `MIGRATED-${Date.now()}-${Math.floor(Math.random()*1000)}`,
              }).onConflictDoNothing();
              // Delete from jobs
              await tx.delete(jobs).where(eq(jobs.id, job.id));
            });
            actionTaken = 'moved';
            movedCount++;
          } else if (module === 'compliance') {
            // MOVE JOB TO COMPLIANCE
            await db.transaction(async (tx) => {
              await tx.insert(compliance).values({
                title: job.title,
                description: job.description,
                issuingAuthority: job.companyName,
                sourceUrl: job.sourceUrl,
                countryId: job.countryId,
                category: 'notices',
                status: 'active'
              }).onConflictDoNothing();
              await tx.delete(jobs).where(eq(jobs.id, job.id));
            });
            actionTaken = 'moved';
            movedCount++;
          }

          // Log verification
          await db.insert(dataVerificationLog).values({
            recordId: job.id,
            sourceModule: 'jobs',
            targetModule: module,
            actionTaken: actionTaken,
          });

        } catch (e: any) {
          console.error(`AI failed for job ${job.id}`, e);
          // Do not log to dataVerificationLog so it is picked up again next time
          hitRateLimit = true;
          break; // Stop processing this batch
        }
      }

      if (hitRateLimit) return;

      // Process Tenders
      for (const tender of unverifiedTenders) {
        const textToAnalyze = `Title: ${tender.title}\nDescription: ${tender.description || ''}\nAuthority: ${tender.contractingAuthority}`;
        try {
          const aiResult = await generateObjectWithFallback({
            modelName: "Google Gemini 2.5 Flash", 
            schema: ClassificationSchema,
            system: "You are a data cleaner. Categorize the following text as a job posting, a tender/procurement notice, or a compliance/legal notice. Be extremely accurate.",
            prompt: textToAnalyze,
          });

          const module = aiResult.object.module;
          let actionTaken = 'none';

          if (module === 'jobs') {
            await db.transaction(async (tx) => {
              await tx.insert(jobs).values({
                title: tender.title,
                description: tender.description || '',
                companyName: tender.contractingAuthority,
                sourceUrl: tender.sourceUrl,
                countryId: tender.countryId,
                regionId: tender.regionId,
                postedDate: tender.publishedAt,
                deadline: tender.deadline,
              }).onConflictDoNothing();
              await tx.delete(tenders).where(eq(tenders.id, tender.id));
            });
            actionTaken = 'moved';
            movedCount++;
          }
          
          await db.insert(dataVerificationLog).values({
            recordId: tender.id,
            sourceModule: 'tenders',
            targetModule: module,
            actionTaken: actionTaken,
          });

        } catch (e: any) {
          console.error(`AI failed for tender ${tender.id}`, e);
          hitRateLimit = true;
          break;
        }
      }

      if (hitRateLimit) return;

      // Process Compliance
      for (const comp of unverifiedCompliance) {
        const textToAnalyze = `Title: ${comp.title}\nDescription: ${comp.description || ''}\nAuthority: ${comp.issuingAuthority}`;
        try {
          const aiResult = await generateObjectWithFallback({
            modelName: "Google Gemini 2.5 Flash", 
            schema: ClassificationSchema,
            system: "You are a data cleaner. Categorize the following text as a job posting, a tender/procurement notice, or a compliance/legal notice. Be extremely accurate.",
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
              }).onConflictDoNothing();
              await tx.delete(compliance).where(eq(compliance.id, comp.id));
            });
            actionTaken = 'moved';
            movedCount++;
          }
          
          await db.insert(dataVerificationLog).values({
            recordId: comp.id,
            sourceModule: 'compliance',
            targetModule: module,
            actionTaken: actionTaken,
          });

        } catch (e: any) {
          console.error(`AI failed for compliance ${comp.id}`, e);
          hitRateLimit = true;
          break;
        }
      }
    });

    if (hitRateLimit) {
      await step.sleep("rate-limit-cooldown", "5m");
    }

    // 5. Send hourly email if needed
    const oneHourMs = 60 * 60 * 1000;
    const now = Date.now();
    
    // We send an email if exactly an hour has elapsed since we started (or multiples of an hour)
    // To do this simply, we'll check if (now - startTime) crossed an hour boundary compared to the start of this batch
    // Alternatively, a simpler way is to just dispatch the next batch and rely on a separate cron for emails,
    // BUT since we are looping, we can just check elapsed time. We pass `lastEmailTime` in the event payload!
    const lastEmailTime = event.data.lastEmailTime || startTime;
    
    let updatedLastEmailTime = lastEmailTime;
    
    if (now - lastEmailTime >= oneHourMs) {
      await step.run("send-hourly-progress-email", async () => {
        // Find total processed count
        const totalProcessedObj = await safeQuery(
          db.select({ count: sql<number>`count(*)` }).from(dataVerificationLog)
        );
        const totalProcessed = totalProcessedObj[0]?.count || 0;
        
        await resend.emails.send({
          from: "AkiliBrain Cleanup <noreply@akilibrain.com>",
          to: "danieljohnfassanga@gmail.com",
          subject: "⏳ Data Cleanup Progress Report",
          html: `<p>The online data verification task is still running.</p>
                 <p>Total records verified so far: <b>${totalProcessed}</b></p>
                 <p>In the latest batch, we processed ${totalToProcess} records and moved <b>${movedCount}</b> out-of-place records to their correct modules.</p>
                 <p>The system will continue to run until all records are verified.</p>`,
        });
      });
      updatedLastEmailTime = now;
    }

    // 6. Recursively trigger the next batch! (This makes it run forever until done)
    await step.sendEvent("trigger-next-batch", {
      name: "data.verification.start",
      data: {
        batchSize: batchSize,
        startTime: startTime,
        lastEmailTime: updatedLastEmailTime,
      }
    });

    return { processed: totalToProcess, moved: movedCount };
  }
);
