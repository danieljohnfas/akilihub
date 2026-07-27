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
    
    // We allow anonymous users now.
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await req.json();
    const { applicationId, transcript } = body;

    if (!applicationId || !transcript || !Array.isArray(transcript)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const apps = await db.select().from(jobApplications).where(eq(jobApplications.id, applicationId)).limit(1);
    if (apps.length === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }
    const app = apps[0];

    const jobRows = await db.select().from(jobs).where(eq(jobs.id, app.jobId)).limit(1);
    const job = jobRows[0];

    // Evaluate transcript
    const systemPrompt = `You are an expert technical interviewer evaluating a candidate's mock interview. 
    Review the transcript of questions and their answers. Based on the job description and the candidate's CV, evaluate their performance.
    Provide a final score out of 100 and detailed feedback on their answers, pointing out strengths and areas for improvement.`;

    const transcriptText = transcript.map(t => `${t.role}: ${t.content}`).join('\n');
    const userPrompt = `Job Title: ${job.title}\nJob Description: ${job.description}\nCandidate CV:\n${app.cvText}\n\nInterview Transcript:\n${transcriptText}`;

    const schema = z.object({
      finalScore: z.number().describe('Final score from 0 to 100 based on interview performance'),
      feedback: z.string().describe('Detailed feedback on the candidate performance'),
    });

    const aiResult = await generateObjectWithFallback({
      system: systemPrompt,
      prompt: userPrompt,
      schema,
    });

    const evalData = aiResult.object;

    const insertedInterview = await db.insert(mockInterviews).values({
      applicationId: app.id,
      transcript: transcript,
      finalScore: evalData.finalScore,
      feedback: evalData.feedback,
    }).returning();

    return NextResponse.json({ success: true, interview: insertedInterview[0] });

  } catch (error: any) {
    console.error('Score API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
