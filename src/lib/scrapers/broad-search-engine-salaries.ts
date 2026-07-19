import { z } from 'zod';
import { generateObjectWithFallback } from '../ai/router';

// The exact Zod schema matching the DB requirements
const salarySchema = z.object({
  jobTitle: z.string().describe('The job title or role (e.g. Software Engineer, Registered Nurse)'),
  experienceLevel: z.enum(['entry', 'mid', 'senior', 'executive']).describe('Estimated experience level based on context'),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'consultancy']).describe('Employment type. Default to full_time if not stated'),
  currency: z.string().describe('Currency code, e.g. KES, TZS, USD, UGX. Default to USD if missing'),
  grossMonthlySalary: z.number().describe('The gross monthly salary as a number (no commas). If given as annual, divide by 12.'),
});

const extractionSchema = z.object({
  salaries: z.array(salarySchema).describe('List of salary data points found in the text'),
});

export type ExtractedSalary = z.infer<typeof salarySchema>;

export async function extractSalariesWithAI(
  text: string,
  countryName: string,
  sourceUrl: string,
): Promise<ExtractedSalary[]> {
  try {
    const prompt = `
You are a data extraction bot building a salary database for Africa.
Extract all structured salary information for ${countryName} from the following text.
URL: ${sourceUrl}

Rules:
1. ONLY extract salaries that are explicitly stated.
2. Convert all figures to GROSS MONTHLY SALARY. If a range is given, take the AVERAGE of the range. If annual is given, divide by 12.
3. Remove all commas from numbers.
4. Currency must be standard 3-letter codes (e.g., KES, TZS, UGX, RWF, ETB, USD).

Text to analyze:
${text.substring(0, 8000)}
`;

    const result = await generateObjectWithFallback({ prompt, schema: extractionSchema });
    if (!result || !result.object || !result.object.salaries) return [];
    
    return result.object.salaries;
  } catch (error) {
    console.error(`[Salaries] AI extraction failed for ${sourceUrl}:`, error);
    return [];
  }
}
