import { TypeSafeClient, choice, noul, score } from '@typesafe-ai/sdk';

/**
 * TypeSafe AI / Jev Client Wrapper
 *
 * Jev is a "System One" decision model optimized for rapid, structured decision-making
 * (classification, quality scoring, legitimacy verification) with calibrated probabilities
 * and 70-500ms latency.
 */

export interface ModuleClassificationResult {
  module: 'jobs' | 'tenders' | 'compliance' | 'unknown';
  confidence: number;
  probabilities: Record<string, number>;
}

export interface QualityScoreResult {
  score: number; // 0 to 3
  level: 'empty' | 'shallow' | 'adequate' | 'rich';
  confidence: number;
}

export interface VerificationResult {
  isValid: boolean;
  probability: number;
}

export interface MatchScoreResult {
  score: number; // 0 to 100 normalized
  level: string;
  confidence: number;
}

// Singleton client instance
let _client: TypeSafeClient | null = null;

/**
 * Checks whether the Jev / TypeSafe AI API is configured via environment variable.
 */
export function isJevAvailable(): boolean {
  const key = process.env.TYPESAFE_API_KEY;
  return Boolean(key && key.trim().length > 0);
}

/**
 * Returns the singleton TypeSafeClient or null if no API key is provided.
 */
export function getJevClient(): TypeSafeClient | null {
  if (!isJevAvailable()) return null;
  if (!_client) {
    try {
      _client = new TypeSafeClient({
        apiKey: process.env.TYPESAFE_API_KEY!.trim(),
        timeout: 10_000,
      });
    } catch (err) {
      console.warn('[Jev] Failed to initialize TypeSafeClient:', err);
      return null;
    }
  }
  return _client;
}

/**
 * Classifies a record into one of the core modules ('jobs', 'tenders', 'compliance', 'unknown')
 * using Jev's `choice` primitive.
 */
export async function classifyModule(
  state: string,
  options?: { timeout?: number }
): Promise<ModuleClassificationResult | null> {
  const client = getJevClient();
  if (!client) return null;

  try {
    const result = await client.systemOne(
      {
        state: state.substring(0, 4000),
        questions: {
          module: choice(
            'Determine which platform module this opportunity or record belongs to:',
            {
              jobs: 'An employment listing, job vacancy, internship, or career recruitment for job seekers',
              tenders: 'A public or private procurement tender, contract bid, Request for Proposal (RFP), or expression of interest',
              compliance: 'A government regulatory notice, business permit rule, tax requirement, statutory mandate, or corporate compliance guideline',
              unknown: 'A general news article, opinion piece, expired or corrupted listing, spam, or content that does not fit jobs, tenders, or compliance',
            }
          ),
        },
      },
      { timeout: options?.timeout ?? 8_000 }
    );

    const answer = result.answers.module;
    const selected = (answer.choice as 'jobs' | 'tenders' | 'compliance' | 'unknown') || 'unknown';

    return {
      module: selected,
      confidence: answer.confidence ?? 0.5,
      probabilities: (answer.probabilities as Record<string, number>) ?? {},
    };
  } catch (err) {
    console.warn('[Jev] classifyModule error:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Scores the data richness / quality of a scraped opportunity using Jev's `score` primitive.
 * Rubric:
 * 0: Empty / Broken
 * 1: Shallow (minimal text, missing requirements or key context)
 * 2: Adequate (clear description and basics)
 * 3: Rich (comprehensive, structured, actionable)
 */
export async function scoreQuality(
  state: string,
  options?: { timeout?: number }
): Promise<QualityScoreResult | null> {
  const client = getJevClient();
  if (!client) return null;

  try {
    const result = await client.systemOne(
      {
        state: state.substring(0, 4000),
        questions: {
          quality: score(
            'Score the completeness and depth of this opportunity listing:',
            [
              'Empty or broken - text is missing, corrupted, or consists of cookie/navigation boilerplate with no real details',
              'Shallow - brief description under a couple sentences, missing requirements, responsibilities, or clear dates',
              'Adequate - provides standard description and core details about the role, tender, or compliance notice',
              'Rich - in-depth, structured opportunity with comprehensive responsibilities, qualifications, dates, and actionable instructions',
            ]
          ),
        },
      },
      { timeout: options?.timeout ?? 8_000 }
    );

    const answer = result.answers.quality;
    const roundedScore = Math.max(0, Math.min(3, Math.round(answer.score)));
    const levels: QualityScoreResult['level'][] = ['empty', 'shallow', 'adequate', 'rich'];

    return {
      score: answer.score,
      level: levels[roundedScore] || 'adequate',
      confidence: answer.confidence ?? 0.5,
    };
  } catch (err) {
    console.warn('[Jev] scoreQuality error:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Verifies whether a discovered URL or candidate item represents an active, legitimate opportunity
 * using Jev's `noul` primitive (calibrated yes/no probability).
 */
export async function isRelevantOpportunity(
  state: string,
  options?: { timeout?: number }
): Promise<VerificationResult | null> {
  const client = getJevClient();
  if (!client) return null;

  try {
    const result = await client.systemOne(
      {
        state: state.substring(0, 3000),
        questions: {
          isLegitimate: noul(
            'Is this an active, legitimate opportunity (job vacancy, open tender, or business compliance rule) that an applicant or organization can act upon?',
            {
              true: 'Yes, this is a real, active opportunity or legal notice with clear substance',
              false: 'No, this is expired, spam, an aggregator list without individual job details, error page, or unrelated content',
            }
          ),
        },
      },
      { timeout: options?.timeout ?? 8_000 }
    );

    const answer = result.answers.isLegitimate;
    const probability = answer.noul ?? 0.5;

    return {
      isValid: probability >= 0.6,
      probability,
    };
  } catch (err) {
    console.warn('[Jev] isRelevantOpportunity error:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Evaluates candidate-to-job fit using Jev's `score` primitive.
 * Rubric:
 * 0: Irrelevant / Mismatch (0-25%)
 * 1: Basic / Entry match (25-50%)
 * 2: Competent match with majority of required skills (50-75%)
 * 3: Excellent candidate with matching skills and relevant domain experience (75-100%)
 */
export async function scoreCandidateJobMatch(
  cvText: string,
  jobText: string,
  options?: { timeout?: number }
): Promise<MatchScoreResult | null> {
  const client = getJevClient();
  if (!client) return null;

  try {
    const combinedState = `CANDIDATE CV:\n${cvText.substring(0, 2000)}\n\nJOB DETAILS:\n${jobText.substring(0, 2000)}`;

    const result = await client.systemOne(
      {
        state: combinedState,
        questions: {
          match: score(
            'Rate how well the candidate qualification and experience match the job requirements:',
            [
              'Unrelated - candidate does not have the skills or background required for this position',
              'Partial - candidate has foundational or adjacent skills, but lacks core requirements or domain experience',
              'Strong - candidate possesses most key required skills and relevant experience',
              'Exceptional - candidate matches or exceeds the required technical skills, experience level, and qualifications',
            ]
          ),
        },
      },
      { timeout: options?.timeout ?? 10_000 }
    );

    const answer = result.answers.match;
    // Map 0-3 score to 0-100 percentage
    const normalizedScore = Math.min(100, Math.max(0, Math.round((answer.score / 3) * 100)));
    const levels = ['Unrelated', 'Partial Match', 'Strong Match', 'Exceptional Match'];
    const roundedIdx = Math.max(0, Math.min(3, Math.round(answer.score)));

    return {
      score: normalizedScore,
      level: levels[roundedIdx],
      confidence: answer.confidence ?? 0.5,
    };
  } catch (err) {
    console.warn('[Jev] scoreCandidateJobMatch error:', err instanceof Error ? err.message : err);
    return null;
  }
}
