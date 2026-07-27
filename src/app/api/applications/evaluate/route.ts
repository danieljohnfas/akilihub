import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { jobApplications } from '@/lib/db/schema/applications';
import { eq } from 'drizzle-orm';
import { generateObjectWithFallback } from '@/lib/ai/router';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const sessionId = null;

    const body = await req.json();
    const { jobId, cvText, cvUrl } = body;

    if (!jobId || (!cvText && !cvUrl)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const jobRows = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (jobRows.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    const job = jobRows[0];

    // Evaluate using AI
    const systemPrompt = `You are an expert technical recruiter. Evaluate the following CV against the given Job Description.
Provide a match score (0-100), detailed feedback on why, and a tailored cover letter based on the CV's strengths relative to the job.`;

    const userPrompt = `Job Title: ${job.title}\nCompany: ${job.companyName}\nDescription: ${job.description}\nRequirements: ${job.requirements}\n\nCandidate CV:\n${cvText}`;

    const schema = z.object({
      score: z.number().describe('Match score from 0 to 100'),
      matchAnalysis: z.string().describe('Detailed feedback on candidate fit'),
      coverLetter: z.string().describe('Tailored cover letter ready for submission'),
    });

    const aiResult = await generateObjectWithFallback({
      system: systemPrompt,
      prompt: userPrompt,
      schema,
    });

    const evalData = aiResult.object;

    // Insert to DB
    const insertedApp = await db.insert(jobApplications).values({
      userId: userId,
      sessionId: sessionId,
      jobId: job.id,
      cvUrl: cvUrl,
      cvText: cvText,
      score: evalData.score,
      matchAnalysis: evalData.matchAnalysis,
      coverLetter: evalData.coverLetter,
      status: 'reviewed',
    }).returning();

    return NextResponse.json({ success: true, application: insertedApp[0] });

  } catch (error: any) {
    console.error('Evaluate API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
