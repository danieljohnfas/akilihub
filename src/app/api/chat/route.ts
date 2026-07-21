import { NextRequest, NextResponse } from 'next/server';
import { generateTextWithFallback } from '@/lib/ai/router';
// Removed tool import

import { z } from 'zod';
import { db } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { tenders } from '@/lib/db/schema/tenders';
import { businesses } from '@/lib/db/schema/compliance';
import { countries, regions } from '@/lib/db/schema/shared';
import { userDocuments } from '@/lib/db/schema/documents';
import { ilike, or, desc, eq } from 'drizzle-orm';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const maxDuration = 30; // Extend Vercel timeout for tool calling

// 10 requests per minute per IP — protects the AI key pool from abuse.
// Guard: only instantiate if the URL is a real https:// endpoint (not a placeholder).
const ratelimit = process.env.UPSTASH_REDIS_REST_URL?.startsWith('https://')
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
      prefix: 'akilihub:chat',
    })
  : null;

export async function POST(req: NextRequest) {
  try {
    const { query, contextParams, documentId } = await req.json();

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required.' }, { status: 400 });
    }

    // Rate limiting: 10 requests per minute per IP
    if (ratelimit) {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anonymous';
      const { success, limit, remaining, reset } = await ratelimit.limit(ip);
      if (!success) {
        return NextResponse.json(
          { error: 'Too many requests. Please wait a moment before trying again.' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': String(limit),
              'X-RateLimit-Remaining': String(remaining),
              'X-RateLimit-Reset': String(reset),
            },
          }
        );
      }
    }

    let documentContext = '';
    if (documentId) {
      const docs = await db.select().from(userDocuments).where(eq(userDocuments.id, documentId)).limit(1);
      if (docs.length > 0) {
        documentContext = `\n\nUSER'S UPLOADED DOCUMENT (CV/Resume):\n${docs[0].summary || docs[0].content}\n`;
      }
    }

    let pageContext = '';
    const pathname = contextParams?.pathname || '';
    if (pathname.startsWith('/jobs/')) {
      const jobId = pathname.split('/')[2];
      if (jobId) {
        const jobRows = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
        if (jobRows.length > 0) {
          const j = jobRows[0];
          pageContext = `\n\nCURRENT PAGE CONTEXT (Job Listing):\nTitle: ${j.title}\nCompany: ${j.companyName}\nDescription: ${j.description}\nRequirements: ${j.requirements || 'N/A'}\n`;
        }
      }
    } else if (pathname.startsWith('/tenders/')) {
      const tenderId = pathname.split('/')[2];
      if (tenderId) {
        const tenderRows = await db.select().from(tenders).where(eq(tenders.id, tenderId)).limit(1);
        if (tenderRows.length > 0) {
          const t = tenderRows[0];
          pageContext = `\n\nCURRENT PAGE CONTEXT (Tender Listing):\nTitle: ${t.title}\nAuthority: ${t.contractingAuthority}\nDescription: ${t.description}\n`;
        }
      }
    }

    const systemPrompt = `You are AkiliBrain, an expert assistant for navigating East African government tenders, jobs, and compliance requirements.
You MUST use your tools to search the database when the user asks for jobs, tenders, or business compliance.
Do NOT invent or guess data. If the tools return no results, politely tell the user you couldn't find any matching records.
If the user asks for a cover letter or CV review, and a document is provided, you MUST compare it against the CURRENT PAGE CONTEXT (if available) and provide a highly tailored, professional output formatted in Markdown.
Context: ${JSON.stringify(contextParams)}${pageContext}${documentContext}`;

    const result = await generateTextWithFallback({
      system: systemPrompt,
      prompt: query.trim(),
      maxSteps: 3, // Allow the AI to call a tool, read the result, and respond
      tools: {
        searchJobs: {
          description: 'Search for jobs in the database by keyword or location',
          parameters: z.object({
            keyword: z.string().describe('Keyword to search for in job titles or descriptions (e.g. "software", "Nairobi", "driver")'),
          }),
          execute: async ({ keyword }: { keyword: string }) => {
            console.log(`[AI Tool] Searching jobs for: ${keyword}`);
            const found = await db.select({
              title: jobs.title,
              company: jobs.companyName,
              region: regions.name,
              country: countries.name,
              url: jobs.sourceUrl,
              posted: jobs.postedDate
            })
            .from(jobs)
            .leftJoin(countries, eq(jobs.countryId, countries.id))
            .leftJoin(regions, eq(jobs.regionId, regions.id))
            .where(or(ilike(jobs.title, `%${keyword}%`), ilike(jobs.description, `%${keyword}%`)))
            .orderBy(desc(jobs.postedDate))
            .limit(10);
            return JSON.stringify(found);
          }
        },
        searchTenders: {
          description: 'Search for government tenders by keyword',
          parameters: z.object({
            keyword: z.string().describe('Keyword to search for in tender titles or descriptions (e.g. "construction", "computers", "Dodoma")'),
          }),
          execute: async ({ keyword }: { keyword: string }) => {
            console.log(`[AI Tool] Searching tenders for: ${keyword}`);
            const found = await db.select({
              title: tenders.title,
              authority: tenders.contractingAuthority,
              status: tenders.status,
              url: tenders.sourceUrl,
              deadline: tenders.deadline
            })
            .from(tenders)
            .where(or(ilike(tenders.title, `%${keyword}%`), ilike(tenders.description, `%${keyword}%`)))
            .orderBy(desc(tenders.publishedAt))
            .limit(10);
            return JSON.stringify(found);
          }
        },
        searchCompliance: {
          description: 'Search for registered businesses to check their compliance status',
          parameters: z.object({
            keyword: z.string().describe('Name of the company or registration number'),
          }),
          execute: async ({ keyword }: { keyword: string }) => {
            console.log(`[AI Tool] Searching businesses for: ${keyword}`);
            const found = await db.select({
              name: businesses.name,
              regNumber: businesses.registrationNumber,
              status: businesses.status,
            })
            .from(businesses)
            .where(ilike(businesses.name, `%${keyword}%`))
            .limit(10);
            return JSON.stringify(found);
          }
        }
      }
    });

    return NextResponse.json({
      response: (result as { text: string }).text,
      confidence: 1.0,
      sources: [],
      strategyUsed: 'Vercel AI Pool with RAG Tools',
    });
  } catch (error) {
    console.error('[/api/chat] All strategies failed:', error);
    return NextResponse.json(
      { error: 'All AI services are currently at capacity. Please try again in a few minutes.' },
      { status: 503 }
    );
  }
}
