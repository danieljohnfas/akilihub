import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

export interface PlausibilityResult {
  plausible: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

/**
 * Strategy 1: AI Plausibility Check
 * Uses Gemini Flash to assess whether a salary submission is realistic for the
 * given role, country, and experience level. Conservative threshold: only marks
 * plausible when confidence is high.
 */
export async function checkSalaryPlausibility(params: {
  jobTitle: string;
  countryName: string;
  experienceLevel: string;
  employmentType: string;
  currency: string;
  grossMonthlySalary: number;
}): Promise<PlausibilityResult> {
  const { jobTitle, countryName, experienceLevel, employmentType, currency, grossMonthlySalary } = params;

  const prompt = `You are a salary data quality reviewer for East Africa. Assess whether the following salary submission is plausible.

Job Title: ${jobTitle}
Country: ${countryName}
Experience Level: ${experienceLevel}
Employment Type: ${employmentType}
Gross Monthly Salary: ${currency} ${grossMonthlySalary.toLocaleString()}

Rules:
- Compare against known East African salary benchmarks for this role and seniority.
- Flag as implausible only if clearly fraudulent or wildly unrealistic (e.g. entry-level accountant earning USD 50,000/month in Tanzania, or a CEO earning TZS 50,000/month).
- Be conservative: if you're uncertain, lean toward marking it plausible.
- A high confidence plausible rating means you're quite sure this is realistic.
- Return a short, factual reason (1 sentence max).`;

  try {
    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: z.object({
        plausible: z.boolean(),
        confidence: z.enum(['high', 'medium', 'low']),
        reason: z.string().max(200),
      }),
      prompt,
    });

    return object;
  } catch (err) {
    // On error, fail open (don't block submission) but don't auto-verify
    console.error('[salary-plausibility] AI check failed:', err);
    return { plausible: false, confidence: 'low', reason: 'AI check unavailable' };
  }
}
