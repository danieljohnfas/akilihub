import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { jobApplications, mockInterviews } from '@/lib/db/schema/applications';
import { jobs } from '@/lib/db/schema/jobs';
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

    const body = await req.json();
    const { applicationId } = body;

    if (!applicationId) {
      return NextResponse.json({ error: 'Missing applicationId' }, { status: 400 });
    }

    const apps = await db.select().from(jobApplications).where(eq(jobApplications.id, applicationId)).limit(1);
    if (apps.length === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }
    const app = apps[0];

    const jobRows = await db.select().from(jobs).where(eq(jobs.id, app.jobId)).limit(1);
    const job = jobRows[0];

    // Generate questions using AI
    const systemPrompt = `You are an expert technical interviewer. Based on the candidate's CV and the job description, generate 5 highly relevant interview questions. 
    The questions should test the candidate's experience relative to the job requirements.`;

    const userPrompt = `Job Title: ${job.title}\nJob Description: ${job.description}\nRequirements: ${job.requirements}\n\nCandidate CV:\n${app.cvText}`;

    const schema = z.object({
      questions: z.array(z.string()).length(5).describe('An array of 5 interview questions'),
    });

    const aiResult = await generateObjectWithFallback({
      system: systemPrompt,
      prompt: userPrompt,
      schema,
    });

    return NextResponse.json({ success: true, questions: aiResult.object.questions });

  } catch (error: any) {
    console.error('Generate Questions API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
