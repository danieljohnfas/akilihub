import { NextRequest, NextResponse } from 'next/server';
import { db, safeQuery } from '@/lib/db/client';
import { userDocuments } from '@/lib/db/schema/documents';
import { jobs } from '@/lib/db/schema/jobs';
import { eq, sql } from 'drizzle-orm';
import { generateObjectWithFallback } from '@/lib/ai/router';
import { isJevAvailable, scoreCandidateJobMatch } from '@/lib/ai/jev-client';
import { z } from 'zod';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const maxDuration = 60; // 60 seconds
export const dynamic = 'force-dynamic';

const ExtractedSkillsSchema = z.object({
  keywords: z.array(z.string()).describe("Top 5 most critical technical keywords or skills from the CV"),
  experienceLevel: z.enum(['entry', 'mid', 'senior', 'executive']).describe("The inferred experience level")
});

const MatchSchema = z.object({
  matches: z.array(z.object({
    jobId: z.string(),
    matchScore: z.number().min(0).max(100),
    matchReason: z.string().describe("A one-sentence explanation of why this job is a match")
  }))
});

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, { prefix: 'match-cv', max: 10, window: '1 m' });
  if (limited) return limited;

  try {
    const { documentId, countryId } = await req.json();

    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }

    // 1. Fetch CV
    const cvRows = await safeQuery(
      db.select().from(userDocuments).where(eq(userDocuments.id, documentId)).limit(1),
      8000,
      'Fetch CV for match'
    );
    const cv = cvRows?.[0];
    if (!cv) {
      return NextResponse.json({ error: 'CV not found' }, { status: 404 });
    }

    const cvText = cv.summary || cv.content || '';

    // 2. Extract Keywords
    const aiKeywords = await generateObjectWithFallback({
      modelName: "Google Gemini 2.5 Flash",
      schema: ExtractedSkillsSchema,
      system: "You are an expert technical recruiter. Extract the 5 most critical search keywords from this CV to find matching jobs.",
      prompt: cvText.substring(0, 5000),
      temperature: 0.1
    });

    const { keywords, experienceLevel } = aiKeywords.object;
    const tsQuery = keywords.join(' | ');

    // 3. Query DB using Full-Text Search with safeQuery
    const searchFilter = countryId
      ? sql`is_active = true AND country_id = ${countryId} AND to_tsvector('english', title || ' ' || coalesce(description, '')) @@ to_tsquery('english', ${tsQuery})`
      : sql`is_active = true AND to_tsvector('english', title || ' ' || coalesce(description, '')) @@ to_tsquery('english', ${tsQuery})`;

    const candidates = await safeQuery(
      db
        .select({
          id: jobs.id,
          title: jobs.title,
          companyName: jobs.companyName,
          description: jobs.description,
          sourceUrl: jobs.sourceUrl,
        })
        .from(jobs)
        .where(searchFilter)
        .limit(20),
      8000,
      'Search candidate jobs for CV match'
    );

    if (!candidates || candidates.length === 0) {
       return NextResponse.json({ matches: [], message: 'No jobs found matching your skills in the database.' });
    }

    // 4. Score matches (Jev System One fast scoring if available, Gemini fallback)
    let scoredMatches: { jobId: string; matchScore: number; matchReason: string }[] = [];

    if (isJevAvailable()) {
      try {
        const topCandidates = candidates.slice(0, 8);
        const jevScores = await Promise.all(
          topCandidates.map(async (c) => {
            const jobSummary = `Title: ${c.title}\nCompany: ${c.companyName}\nDescription: ${(c.description || '').substring(0, 300)}`;
            const res = await scoreCandidateJobMatch(cvText, jobSummary);
            return {
              jobId: c.id,
              matchScore: res?.score ?? 50,
              matchReason: `Evaluated by Jev as ${res?.level ?? 'match'} based on CV technical alignment.`,
            };
          })
        );
        scoredMatches = jevScores.filter(s => s.matchScore >= 40);
      } catch (err) {
        console.warn('[MatchCV] Jev scoring encountered error, falling back to Gemini:', err);
      }
    }

    // If Jev was not available or produced no results, use Gemini
    if (scoredMatches.length === 0) {
      const scoringPrompt = `
        CV Summary: ${cvText.substring(0, 3000)}
        Experience Level: ${experienceLevel}
        
        Job Candidates:
        ${candidates.map(c => `ID: ${c.id}\nTitle: ${c.title}\nCompany: ${c.companyName}\nDescription: ${(c.description || '').substring(0, 300)}`).join('\n\n')}
        
        Score each job out of 100 based on how well it fits the CV. Return only the top 5 matches.
      `;

      const aiMatches = await generateObjectWithFallback({
        modelName: "Google Gemini 2.5 Flash",
        schema: MatchSchema,
        system: "You are a precise job matching algorithm. Score jobs aggressively. If it's a poor fit, score it low.",
        prompt: scoringPrompt,
        temperature: 0.1
      });

      scoredMatches = aiMatches.object.matches;
    }

    // 5. Hydrate results
    const results = scoredMatches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5)
      .map(match => {
        const candidate = candidates.find(c => c.id === match.jobId);
        return {
          ...match,
          title: candidate?.title,
          companyName: candidate?.companyName,
          sourceUrl: candidate?.sourceUrl,
        };
      })
      .filter(m => m.title); // Ensure it matched valid IDs

    return NextResponse.json({ matches: results });
  } catch (error) {
    console.error('Match CV Error:', error);
    return NextResponse.json({ error: 'Failed to match CV' }, { status: 500 });
  }
}
