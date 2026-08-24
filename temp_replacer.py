import re
with open('scripts/mass-scrape.ts', 'r', encoding='utf-8') as f:
    content = f.read()

matrix_code = '''
const PROFESSIONS = ['accounting', 'IT', 'software developer', 'nursing', 'medical', 'project manager', 'procurement', 'HR', 'finance', 'engineering', 'teaching'];
const SECTORS = ['NGO', 'government', 'bank', 'UN', 'remote', 'graduate', 'internship', 'healthcare', 'humanitarian'];
const EMPLOYERS = ['UNICEF', 'WHO', 'World Bank', 'Deloitte', 'PwC', 'WFP', 'Safaricom', 'Vodacom'];
const CITIES: Record<string, string[]> = {
  KE: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru'],
  TZ: ['Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma'],
  UG: ['Kampala', 'Entebbe', 'Jinja', 'Gulu'],
  RW: ['Kigali', 'Musanze', 'Rubavu'],
  ET: ['Addis Ababa', 'Hawassa', 'Dire Dawa'],
  CD: ['Kinshasa', 'Lubumbashi', 'Goma'],
  BI: ['Bujumbura', 'Gitega'],
  SO: ['Mogadishu', 'Hargeisa'],
  SS: ['Juba', 'Malakal'],
};

const JOB_QUERIES: Record<string, string[]> = {};
for (const [code, cities] of Object.entries(CITIES)) {
  const queries: string[] = [];
  queries.push(`jobs ${code}`);
  for (const prof of PROFESSIONS.slice(0, 5)) {
    queries.push(`${prof} jobs ${code}`);
    queries.push(`${prof} jobs ${cities[0]}`);
  }
  for (const sec of SECTORS.slice(0, 4)) {
    queries.push(`${sec} jobs ${code}`);
  }
  for (const emp of EMPLOYERS.slice(0, 3)) {
    queries.push(`${emp} jobs ${code}`);
  }
  for (let i = 0; i < 5; i++) {
    const rProf = PROFESSIONS[Math.floor(Math.random() * PROFESSIONS.length)];
    const rSec = SECTORS[Math.floor(Math.random() * SECTORS.length)];
    const rCity = cities[Math.floor(Math.random() * cities.length)];
    queries.push(`${rProf} ${rSec} jobs ${rCity}`);
  }
  JOB_QUERIES[code] = queries;
}
'''

save_jobs_replacement = '''
function calculateSeoScore(job: BroadJobResource): number {
  let score = 0;
  if (job.companyName && job.companyName.toLowerCase() !== 'unknown') score += 10;
  if (job.title) score += 10;
  if (job.regionId) score += 10;
  if (job.deadline && new Date(job.deadline) > new Date()) score += 10;
  if (job.salaryMin || job.salaryMax) score += 8;
  if (job.deadline) score += 8;
  if (job.description && job.description.length > 500) score += 5;
  if (job.sourceUrl && !job.sourceUrl.includes('google.com')) score += 5;
  if (job.requirements && job.requirements.length > 0) score += 5;
  return score;
}

async function saveJobs(items: BroadJobResource[], cid: string) {
  if (items.length === 0) return { ins: 0, errs: [] };
  try {
    const validItems = items.filter(job => calculateSeoScore(job) >= 30);
    if (validItems.length === 0) return { ins: 0, errs: [] };

    const values = validItems.map(job => {
      const score = calculateSeoScore(job);
      return {
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
      };
    });
    const r = await withDbTimeout(
      db.insert(jobs).values(values).onConflictDoNothing().returning({ id: jobs.id })
    );
    return { ins: r.length, errs: [] };
  } catch (e) {
    return { ins: 0, errs: [(e as Error).message?.slice(0, 80)] };
  }
}
'''

content = re.sub(r'const JOB_QUERIES: Record<string, string\[\]> = \{.*?\};', matrix_code, content, flags=re.DOTALL)
content = re.sub(r'async function saveJobs\(items: BroadJobResource\[\], cid: string\) \{.*?\}(?=\nasync function saveTenders)', save_jobs_replacement.strip(), content, flags=re.DOTALL)

with open('scripts/mass-scrape.ts', 'w', encoding='utf-8') as f:
    f.write(content)
