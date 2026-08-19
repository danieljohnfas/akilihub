import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { tenders } from '@/lib/db/schema/tenders';
import { complianceRequirements as compliance } from '@/lib/db/schema/compliance';
import { dataVerificationLog } from '@/lib/db/schema/admin';
import { eq, isNull } from 'drizzle-orm';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { Resend } from 'resend';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const ClassificationSchema = z.object({
  module: z.enum(['jobs', 'tenders', 'compliance', 'unknown']).describe('The correct module for this record based on its content.'),
});

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');
const REPORT_EMAIL = 'danieljohnfassanga@gmail.com';

async function generateObjectWithFallback({ system, prompt, schema }: any) {
  return await generateObject({
    model: google('gemini-2.5-flash'),
    schema,
    system,
    prompt,
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    if (url.searchParams.get('secret') !== 'start-cleaning-now') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const BATCH_SIZE = 5;
    let unverifiedJobs = await db.select({ id: jobs.id, title: jobs.title, description: jobs.description, companyName: jobs.companyName, sourceUrl: jobs.sourceUrl, countryId: jobs.countryId, regionId: jobs.regionId, postedDate: jobs.postedDate, deadline: jobs.deadline }).from(jobs).leftJoin(dataVerificationLog, eq(jobs.id, dataVerificationLog.recordId)).where(isNull(dataVerificationLog.id)).limit(BATCH_SIZE);
    
    let unverifiedTenders: any[] = [];
    if (unverifiedJobs.length === 0) {
      unverifiedTenders = await db.select({ id: tenders.id, title: tenders.title, description: tenders.description, contractingAuthority: tenders.contractingAuthority, sourceUrl: tenders.sourceUrl, countryId: tenders.countryId, regionId: tenders.regionId, postedDate: tenders.publishedAt, deadline: tenders.deadline }).from(tenders).leftJoin(dataVerificationLog, eq(tenders.id, dataVerificationLog.recordId)).where(isNull(dataVerificationLog.id)).limit(BATCH_SIZE);
    }

    let unverifiedCompliance: any[] = [];
    if (unverifiedJobs.length === 0 && unverifiedTenders.length === 0) {
      unverifiedCompliance = await db.select({ id: compliance.id, title: compliance.title, description: compliance.description, issuingAuthority: compliance.issuingAuthority, sourceUrl: compliance.sourceUrl, countryId: compliance.countryId }).from(compliance).leftJoin(dataVerificationLog, eq(compliance.id, dataVerificationLog.recordId)).where(isNull(dataVerificationLog.id)).limit(BATCH_SIZE);
    }

    const totalToProcess = unverifiedJobs.length + unverifiedTenders.length + unverifiedCompliance.length;

    if (totalToProcess === 0) {
      return NextResponse.json({ success: true, message: 'All done!' });
    }

    let processedCount = 0;
    let movedCount = 0;

    for (const job of unverifiedJobs) {
      try {
        const aiResult = await generateObjectWithFallback({
          schema: ClassificationSchema,
          system: "You are a data quality controller. Classify this record as: 'jobs', 'tenders', 'compliance', or 'unknown'.",
          prompt: "Title: " + job.title + "\nDescription: " + (job.description || '').substring(0, 500) + "\nCompany: " + job.companyName,
        });

        const module = (aiResult.object as any).module;
        let actionTaken = 'none';

        if (module === 'tenders') {
          await db.transaction(async (tx) => {
            await tx.insert(tenders).values({ title: job.title, description: job.description, contractingAuthority: job.companyName, sourceUrl: job.sourceUrl, countryId: job.countryId, regionId: job.regionId, publishedAt: job.postedDate, deadline: job.deadline, referenceNo: 'MIG-' + Date.now() } as any).onConflictDoNothing();
            await tx.delete(jobs).where(eq(jobs.id, job.id));
          });
          actionTaken = 'moved'; movedCount++;
        } else if (module === 'compliance') {
          await db.transaction(async (tx) => {
            await tx.insert(compliance).values({ title: job.title, description: job.description, issuingAuthority: job.companyName, sourceUrl: job.sourceUrl, countryId: job.countryId, category: 'sector_specific', status: 'active' } as any).onConflictDoNothing();
            await tx.delete(jobs).where(eq(jobs.id, job.id));
          });
          actionTaken = 'moved'; movedCount++;
        }

        await db.insert(dataVerificationLog).values({ recordId: job.id, sourceModule: 'jobs', targetModule: module, actionTaken });
        processedCount++;
      } catch (e) {
        console.error('Job error', e);
        break; // Stop batch on error (rate limit)
      }
    }

    for (const tender of unverifiedTenders) {
      try {
        const aiResult = await generateObjectWithFallback({
          schema: ClassificationSchema,
          system: "You are a data quality controller. Classify this record as: 'jobs', 'tenders', 'compliance', or 'unknown'.",
          prompt: "Title: " + tender.title + "\nDescription: " + (tender.description || '').substring(0, 500) + "\nAuthority: " + tender.contractingAuthority,
        });

        const module = (aiResult.object as any).module;
        let actionTaken = 'none';

        if (module === 'jobs') {
          await db.transaction(async (tx) => {
            await tx.insert(jobs).values({ title: tender.title, description: tender.description, companyName: tender.contractingAuthority, sourceUrl: tender.sourceUrl, countryId: tender.countryId, regionId: tender.regionId, postedDate: tender.postedDate, deadline: tender.deadline } as any).onConflictDoNothing();
            await tx.delete(tenders).where(eq(tenders.id, tender.id));
          });
          actionTaken = 'moved'; movedCount++;
        } else if (module === 'compliance') {
          await db.transaction(async (tx) => {
            await tx.insert(compliance).values({ title: tender.title, description: tender.description, issuingAuthority: tender.contractingAuthority, sourceUrl: tender.sourceUrl, countryId: tender.countryId, category: 'sector_specific', status: 'active' } as any).onConflictDoNothing();
            await tx.delete(tenders).where(eq(tenders.id, tender.id));
          });
          actionTaken = 'moved'; movedCount++;
        }

        await db.insert(dataVerificationLog).values({ recordId: tender.id, sourceModule: 'tenders', targetModule: module, actionTaken });
        processedCount++;
      } catch (e) {
        console.error('Tender error', e);
        break;
      }
    }

    for (const comp of unverifiedCompliance) {
      try {
        const aiResult = await generateObjectWithFallback({
          schema: ClassificationSchema,
          system: "You are a data quality controller. Classify this record as: 'jobs', 'tenders', 'compliance', or 'unknown'.",
          prompt: "Title: " + comp.title + "\nDescription: " + (comp.description || '').substring(0, 500) + "\nAuthority: " + comp.issuingAuthority,
        });

        const module = (aiResult.object as any).module;
        let actionTaken = 'none';

        if (module === 'jobs') {
          await db.transaction(async (tx) => {
            await tx.insert(jobs).values({ title: comp.title, description: comp.description, companyName: comp.issuingAuthority, sourceUrl: comp.sourceUrl, countryId: comp.countryId } as any).onConflictDoNothing();
            await tx.delete(compliance).where(eq(compliance.id, comp.id));
          });
          actionTaken = 'moved'; movedCount++;
        } else if (module === 'tenders') {
          await db.transaction(async (tx) => {
            await tx.insert(tenders).values({ title: comp.title, description: comp.description, contractingAuthority: comp.issuingAuthority, sourceUrl: comp.sourceUrl, countryId: comp.countryId, referenceNo: 'MIG-' + Date.now() } as any).onConflictDoNothing();
            await tx.delete(compliance).where(eq(compliance.id, comp.id));
          });
          actionTaken = 'moved'; movedCount++;
        }

        await db.insert(dataVerificationLog).values({ recordId: comp.id, sourceModule: 'compliance', targetModule: module, actionTaken });
        processedCount++;
      } catch (e) {
        console.error('Compliance error', e);
        break;
      }
    }

    return NextResponse.json({ success: true, processed: processedCount, moved: movedCount });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
