import { db } from '../src/lib/db/client';
import { jobs, jobTypeEnum } from '../src/lib/db/schema/jobs';
import { isNull, eq, sql } from 'drizzle-orm';

const SECTORS = {
  'Technology': ['software', 'developer', 'it ', 'tech ', 'programming', 'network', 'data science', 'cybersecurity'],
  'Healthcare': ['nurse', 'doctor', 'medical', 'hospital', 'clinical', 'pharmacy', 'patient'],
  'Finance': ['accountant', 'finance', 'banking', 'audit', 'tax', 'investment', 'payroll'],
  'Education': ['teacher', 'tutor', 'school', 'education', 'university', 'professor', 'instructor'],
  'Engineering': ['engineer', 'civil', 'mechanical', 'electrical', 'construction', 'manufacturing'],
  'Sales & Marketing': ['sales', 'marketing', 'seo', 'advertising', 'brand', 'b2b', 'account manager'],
  'Operations': ['logistics', 'supply chain', 'warehouse', 'operations manager', 'fleet'],
  'HR & Admin': ['hr ', 'human resources', 'admin', 'receptionist', 'clerk', 'executive assistant'],
  'Legal': ['lawyer', 'attorney', 'legal', 'paralegal', 'counsel'],
  'Hospitality': ['hotel', 'restaurant', 'chef', 'waiter', 'hospitality', 'tourism']
};

function extractExperience(text: string): string | null {
  const match = text.match(/(\d+)\+?\s*(?:to|-)\s*(\d+)?\s*(?:years?|yrs?)\s+(?:of\s+)?experience/i) || 
                text.match(/(\d+)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?experience/i);
  if (match) {
    if (match[2]) return `${match[1]}-${match[2]} years`;
    return `${match[1]}+ years`;
  }
  if (text.toLowerCase().includes('entry level') || text.toLowerCase().includes('fresh graduate')) return 'Entry Level';
  return null;
}

function extractJobType(text: string): typeof jobTypeEnum.enumValues[number] {
  const lower = text.toLowerCase();
  if (lower.includes('internship') || lower.includes('attach?')) return 'internship';
  if (lower.includes('part-time') || lower.includes('part time')) return 'part_time';
  if (lower.includes('contract') || lower.includes('freelance')) return 'contract';
  if (lower.includes('remote') || lower.includes('work from home')) return 'remote';
  return 'full_time'; // Default fallback
}

function extractSector(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [sector, keywords] of Object.entries(SECTORS)) {
    if (keywords.some(k => lower.includes(k))) return sector;
  }
  return null;
}

async function run() {
  console.log('[RegexEngine] Booting fast local extraction engine...');
  const unparsedJobs = await db.select().from(jobs).where(isNull(jobs.sector));
  console.log(`[RegexEngine] Found ${unparsedJobs.length} jobs to parse locally.`);
  
  const batchSize = 1000;
  let updated = 0;
  
  for (let i = 0; i < unparsedJobs.length; i += batchSize) {
    const batch = unparsedJobs.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (job) => {
      const fullText = (job.title + ' ' + job.description + ' ' + (job.requirements || '')).replace(/\n/g, ' ');
      
      const exp = extractExperience(fullText);
      const type = extractJobType(fullText);
      const sector = extractSector(fullText);
      
      await db.update(jobs)
        .set({ 
          experienceLevel: exp,
          jobType: type,
          sector: sector,
          updatedAt: new Date()
        })
        .where(eq(jobs.id, job.id));
    }));
    
    updated += batch.length;
    console.log(`[RegexEngine] Processed ${updated}/${unparsedJobs.length} jobs...`);
  }
  
  console.log('[RegexEngine] Complete! All jobs parsed in record time.');
  process.exit(0);
}

run();
