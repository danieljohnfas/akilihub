import { NextRequest, NextResponse } from 'next/server';
import { generateTextWithFallback } from '@/lib/ai/router';
import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { tenders } from '@/lib/db/schema/tenders';
import { businesses } from '@/lib/db/schema/compliance';
import { ilike, or, desc } from 'drizzle-orm';

export const maxDuration = 30; // Extend Vercel timeout for tool calling

export async function POST(req: NextRequest) {
  try {
    const { query, contextParams } = await req.json();

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required.' }, { status: 400 });
    }

    const systemPrompt = `You are AkiliBrain, an expert assistant for navigating East African government tenders, jobs, and compliance requirements.
You MUST use your tools to search the database when the user asks for jobs, tenders, or business compliance.
Do NOT invent or guess data. If the tools return no results, politely tell the user you couldn't find any matching records.
Context: ${JSON.stringify(contextParams)}`;

    const result = await generateTextWithFallback({
      system: systemPrompt,
      prompt: query.trim(),
      maxSteps: 3, // Allow the AI to call a tool, read the result, and respond
      tools: {
        searchJobs: tool({
          description: 'Search for jobs in the database by keyword or location',
          parameters: z.object({
            keyword: z.string().describe('Keyword to search for in job titles or descriptions (e.g. "software", "Nairobi", "driver")'),
          }),
          execute: async ({ keyword }) => {
            console.log(`[AI Tool] Searching jobs for: ${keyword}`);
            const found = await db.select({
              title: jobs.title,
              company: jobs.companyName,
              location: jobs.location,
              url: jobs.sourceUrl,
              posted: jobs.postedDate
            })
            .from(jobs)
            .where(or(ilike(jobs.title, `%${keyword}%`), ilike(jobs.description, `%${keyword}%`)))
            .orderBy(desc(jobs.postedDate))
            .limit(10);
            return found.map(f => ({
              ...f,
              posted: f.posted?.toISOString() || null
            }));
          }
        }),
        searchTenders: tool({
          description: 'Search for government tenders by keyword',
          parameters: z.object({
            keyword: z.string().describe('Keyword to search for in tender titles or descriptions (e.g. "construction", "computers", "Dodoma")'),
          }),
          execute: async ({ keyword }) => {
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
            return found.map(f => ({
              ...f,
              deadline: f.deadline?.toISOString() || null
            }));
          }
        }),
        searchCompliance: tool({
          description: 'Search for registered businesses to check their compliance status',
          parameters: z.object({
            keyword: z.string().describe('Name of the company or registration number'),
          }),
          execute: async ({ keyword }) => {
            console.log(`[AI Tool] Searching businesses for: ${keyword}`);
            const found = await db.select({
              name: businesses.name,
              regNumber: businesses.registrationNumber,
              status: businesses.status,
            })
            .from(businesses)
            .where(ilike(businesses.name, `%${keyword}%`))
            .limit(10);
            return found;
          }
        }),
      }
    });

    return NextResponse.json({
      response: result.text,
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
