import re

with open('scripts/mass-scrape.ts', 'r', encoding='utf-8') as f:
    content = f.read()

import_statement = "import { generateObjectWithFallback } from '../src/lib/ai/router';\nimport { z } from 'zod';\n"
if "generateObjectWithFallback" not in content:
    content = import_statement + content

# Replace saveJobs function
save_jobs_pattern = re.compile(r'async function saveJobs\(items: BroadJobResource\[\], cid: string\) \{.*?(?=\n//)', re.DOTALL)
save_jobs_replacement = '''async function saveJobs(items: BroadJobResource[], cid: string) {
  if (items.length === 0) return { ins: 0, errs: [] };
  try {
    const validItems = items.filter(job => calculateSeoScore(job) >= 30);
    if (validItems.length === 0) return { ins: 0, errs: [] };

    const enrichedItems = [];
    for (const job of validItems) {
      const score = calculateSeoScore(job);
      let sector = null;
      let profession = null;
      let experienceLevel = null;
      let educationLevel = null;
      let skills = [];

      if (score >= 30) {
        try {
          const aiRes = await generateObjectWithFallback({
            prompt: `Extract structured fields from this job posting. Title: ${job.title}, Company: ${job.companyName}. Description: ${job.description || ''}. Requirements: ${job.requirements || ''}`,
            schema: z.object({
              sector: z.string().nullable().describe('Industry sector, e.g. IT, Healthcare, NGO, Finance, Agriculture'),
              profession: z.string().nullable().describe('Profession, e.g. Software Engineer, Accountant, Nurse, Manager'),
              experienceLevel: z.string().nullable().describe('One of: entry-level, junior, mid-level, senior, manager, director, executive, graduate, internship'),
              educationLevel: z.string().nullable().describe('One of: diploma, degree, bachelors, masters, phd, certificate'),
              skills: z.array(z.string()).describe('Top 5 key skills required')
            })
          });
          
          if (aiRes?.object) {
            sector = aiRes.object.sector;
            profession = aiRes.object.profession;
            experienceLevel = aiRes.object.experienceLevel;
            educationLevel = aiRes.object.educationLevel;
            skills = aiRes.object.skills || [];
          }
        } catch (err) {
          console.error('[AI Enrichment Error]', err);
        }
      }

      enrichedItems.push({
        title: job.title,
        companyName: job.companyName || 'Unknown',
        description: job.description || 'No description',
        requirements: job.requirements,
        regionId: job.regionId,
        countryId: cid,
        jobType: job.jobType,
        sourceUrl: job.sourceUrl,
        postedDate: job.postedDate || new Date(),
        deadline: job.deadline ?? null,
        salaryMin: job.salaryMin?.toString() ?? null,
        salaryMax: job.salaryMax?.toString() ?? null,
        salaryCurrency: job.salaryCurrency ?? null,
        isActive: score >= 50,
        needsAiExtraction: false,
        sector,
        profession,
        experienceLevel,
        educationLevel,
        skills
      });
    }

    const r = await withDbTimeout(
      db.insert(jobs).values(enrichedItems).onConflictDoNothing().returning({ id: jobs.id })
    );
    return { ins: r.length, errs: [] };
  } catch (e) {
    return { ins: 0, errs: [(e as Error).message?.slice(0, 80)] };
  }
}'''

content = save_jobs_pattern.sub(save_jobs_replacement, content, count=1)

with open('scripts/mass-scrape.ts', 'w', encoding='utf-8') as f:
    f.write(content)
