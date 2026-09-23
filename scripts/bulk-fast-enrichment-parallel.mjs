import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
// Use 10 connections for high-throughput concurrent bulk updating
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 10, prepare: false });

// ── 1. CLOUDFLARE EMAIL DECODER ───────────────────────────────────────────────
function decodeCloudflareEmail(hex) {
  if (!hex || hex.length < 4) return null;
  try {
    const r = parseInt(hex.substring(0, 2), 16);
    let email = '';
    for (let i = 2; i < hex.length; i += 2) {
      email += String.fromCharCode(parseInt(hex.substring(i, i + 2), 16) ^ r);
    }
    return email && email.includes('@') && email.includes('.') ? email : null;
  } catch {
    return null;
  }
}

// ── 2. SECTORS & PROFESSIONS TAXONOMY ─────────────────────────────────────────
const SECTORS = [
  {
    name: 'Information Technology & Software',
    keywords: ['software', 'developer', 'frontend', 'backend', 'fullstack', 'devops', 'database', 'cyber', 'network', 'system admin', 'data analyst', 'data engineer', 'python', 'java', 'react', 'programmer', 'ict', 'computer science', 'it officer', 'it support', 'web designer', 'scrum'],
    defaultProfession: 'IT & Software Engineering',
  },
  {
    name: 'Healthcare & Pharmaceuticals',
    keywords: ['health', 'medical', 'nurse', 'doctor', 'physician', 'pharmacist', 'pharmacy', 'clinical', 'hospital', 'dental', 'laboratory', 'nursing', 'midwife', 'patient', 'clinic', 'biomedical', 'epidemiology'],
    defaultProfession: 'Healthcare & Medicine',
  },
  {
    name: 'Finance, Banking & Insurance',
    keywords: ['accountant', 'accounting', 'finance', 'banking', 'auditor', 'audit', 'credit', 'loan', 'microfinance', 'insurance', 'treasury', 'tax', 'cashier', 'actuarial', 'teller', 'financial analyst', 'reconciliation', 'governance'],
    defaultProfession: 'Accounting & Finance',
  },
  {
    name: 'Education & Training',
    keywords: ['teacher', 'teaching', 'lecturer', 'tutor', 'academic', 'professor', 'school', 'curriculum', 'education', 'instructor', 'headmaster', 'principal', 'pedagogy'],
    defaultProfession: 'Teaching & Education',
  },
  {
    name: 'Manufacturing, Construction & Engineering',
    keywords: ['civil engineer', 'mechanical engineer', 'electrical engineer', 'technician', 'construction', 'architect', 'manufacturing', 'plant', 'mechanic', 'plumber', 'welder', 'fitter', 'operator', 'site engineer', 'surveyor', 'production manager', 'mining engineer'],
    defaultProfession: 'Engineering & Construction',
  },
  {
    name: 'NGO, Development & Social Services',
    keywords: ['ngo', 'non-profit', 'humanitarian', 'grant', 'monitoring and evaluation', 'm&e', 'community mobilization', 'program officer', 'project officer', 'unicef', 'usaid', 'who', 'social work', 'peace corps', 'advocacy'],
    defaultProfession: 'Community & Social Development',
  },
  {
    name: 'Sales, Marketing & Customer Support',
    keywords: ['sales', 'marketing', 'business development', 'customer care', 'customer service', 'digital marketing', 'brand manager', 'retail', 'call centre', 'call center', 'commercial', 'telesales', 'public relations', 'merchandiser'],
    defaultProfession: 'Sales & Marketing',
  },
  {
    name: 'Logistics, Transport & Procurement',
    keywords: ['procurement', 'supply chain', 'logistics', 'driver', 'warehouse', 'inventory', 'clearing', 'forwarding', 'fleet', 'transport', 'shipping', 'storekeeper'],
    defaultProfession: 'Logistics & Supply Chain',
  },
  {
    name: 'Legal, Compliance & HR',
    keywords: ['human resources', 'hr officer', 'talent acquisition', 'recruiter', 'recruitment', 'legal counsel', 'lawyer', 'advocate', 'compliance', 'regulatory', 'legal officer', 'aml'],
    defaultProfession: 'Human Resources & Legal',
  },
  {
    name: 'Hospitality, Tourism & Catering',
    keywords: ['chef', 'cook', 'hotel', 'waiter', 'waitress', 'housekeeping', 'tourism', 'tour guide', 'receptionist', 'hospitality', 'restaurant', 'food & beverage', 'barista', 'front desk'],
    defaultProfession: 'Hospitality & Tourism',
  },
  {
    name: 'Agriculture, Mining & Energy',
    keywords: ['agriculture', 'agronomy', 'farm', 'agribusiness', 'crop', 'mining', 'geologist', 'mineral', 'oil & gas', 'solar', 'renewable energy', 'livestock', 'veterinary', 'horticulture'],
    defaultProfession: 'Agriculture & Natural Resources',
  },
];

// ── 3. SKILLS TAXONOMY ────────────────────────────────────────────────────────
const SKILLS_MAP = [
  'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'Excel', 'Word', 'PowerPoint',
  'Accounting', 'Financial Analysis', 'Financial Reporting', 'Data Analysis', 'Customer Service',
  'Sales', 'Project Management', 'Communication', 'Public Speaking', 'English', 'Swahili',
  'French', 'Budgeting', 'Monitoring and Evaluation', 'Procurement', 'Contract Management',
  'Graphic Design', 'Social Media', 'Digital Marketing', 'Team Leadership', 'Negotiation',
  'Problem Solving', 'Time Management', 'Human Resources', 'Payroll', 'Recruitment', 'Driving',
  'First Aid', 'Inventory Management', 'Auditing', 'Taxation', 'Report Writing', 'Analytical Skills',
  'Risk Management', 'Supply Chain Management', 'Strategic Planning', 'Relationship Management'
];

function classifySectorAndProfession(title, desc) {
  const combined = `${title || ''} ${desc || ''}`.toLowerCase();
  for (const sec of SECTORS) {
    if (sec.keywords.some(k => combined.includes(k))) {
      return { sector: sec.name, profession: sec.defaultProfession };
    }
  }
  return { sector: 'General Business & Operations', profession: 'Operations & Administration' };
}

function extractSkills(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const matched = [];
  for (const skill of SKILLS_MAP) {
    const regex = new RegExp(`\\b${skill.replace('.', '\\.')}\\b`, 'i');
    if (regex.test(lower)) {
      matched.push(skill);
    }
  }
  return matched.slice(0, 10);
}

function extractStructuredRequirements(text) {
  if (!text || text.length < 50) return null;
  const lines = text.split(/\r?\n/);
  const items = [];
  let inReq = false;

  const startRegex = /(?:requirements|qualifications|experience|skills|eligibility|what\s+you\s+need|vigezo|sifa\s+za\s+mwombaji|exigences)/i;
  const endRegex = /(?:how\s+to\s+apply|benefits|remuneration|salary|jinsi\s+ya\s+kuomba|about\s+the\s+company|muda\s+wa\s+kutuma)/i;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const isBullet = /^[-*•–—]\s+(.+)/.exec(line)
      || /^\d+[.)]\s+(.+)/.exec(line)
      || /^[a-z][.)]\s+(.+)/i.exec(line);

    if (isBullet) {
      const content = isBullet[1].trim();
      if (content.length >= 8 && content.length <= 400) {
        items.push(content);
      }
      continue;
    }

    if (startRegex.test(line)) {
      inReq = true;
      continue;
    }

    if (inReq && endRegex.test(line)) {
      inReq = false;
      break;
    }

    if (inReq && line.length >= 15 && line.length <= 300) {
      items.push(line);
    }
  }

  if (items.length >= 2) {
    return items.slice(0, 12).map(i => `• ${i}`).join('\n');
  }
  return null;
}

async function run() {
  console.log('Starting parallel high-throughput full-database enrichment...\n');

  // Process only rows that still need sector, skills, or requirements
  const [totalRes] = await sql`
    SELECT COUNT(*)::int as count
    FROM jobs
    WHERE sector IS NULL OR skills IS NULL OR requirements IS NULL
  `;
  const total = totalRes.count;
  console.log(`Total jobs requiring enrichment: ${total}`);

  const CHUNK_SIZE = 500;
  const CONCURRENCY = 15;
  let offset = 0;
  let processed = 0;
  let totalUpdated = 0;
  let cfDecoded = 0;
  let reqsExtracted = 0;
  let expiredDeactivated = 0;
  const now = new Date();
  const startTime = Date.now();

  while (true) {
    const rows = await sql`
      SELECT id, title, description, requirements, sector, profession, skills, deadline, is_active
      FROM jobs
      WHERE sector IS NULL OR skills IS NULL OR requirements IS NULL
      ORDER BY id
      LIMIT ${CHUNK_SIZE}
    `;

    if (rows.length === 0) {
      console.log('No more records requiring enrichment.');
      break;
    }

    const updates = [];

    for (const row of rows) {
      let desc = row.description || '';
      let reqs = row.requirements || null;
      let sector = row.sector;
      let profession = row.profession;
      let skills = row.skills;
      let isActive = row.is_active;
      let changed = false;

      // 1. Decode Cloudflare emails
      if (desc && (desc.includes('[email protected]') || desc.includes('data-cfemail='))) {
        const hexMatches = desc.match(/data-cfemail=["']([a-f0-9]+)["']/gi) || desc.match(/\/email-protection#([a-f0-9]+)/gi);
        if (hexMatches) {
          for (const m of hexMatches) {
            const hex = m.replace(/data-cfemail=["']|["']|\/email-protection#/gi, '');
            const email = decodeCloudflareEmail(hex);
            if (email) {
              desc = desc.replace('[email protected]', email).replace(m, email);
              cfDecoded++;
              changed = true;
            }
          }
        }
      }

      // 2. Extract requirements from description
      if ((!reqs || reqs.trim().length < 20) && desc) {
        const extractedReqs = extractStructuredRequirements(desc);
        if (extractedReqs) {
          reqs = extractedReqs;
          reqsExtracted++;
          changed = true;
        }
      }

      // 3. Classify sector & profession
      if (!sector || !profession) {
        const classified = classifySectorAndProfession(row.title, desc);
        sector = sector || classified.sector;
        profession = profession || classified.profession;
        changed = true;
      }

      // 4. Extract skills
      if (!skills || skills.length === 0) {
        const extractedSkills = extractSkills(`${row.title} ${desc} ${reqs || ''}`);
        skills = extractedSkills.length > 0 ? extractedSkills : ['Communication', 'Problem Solving', 'Teamwork'];
        changed = true;
      }

      // 5. Expiration
      if (row.deadline && new Date(row.deadline) < now && isActive !== false) {
        isActive = false;
        expiredDeactivated++;
        changed = true;
      }

      if (changed) {
        const formattedSkills = `{${skills.map(s => `"${s.replace(/"/g, '\\"')}"`).join(',')}}`;
        updates.push({
          id: row.id,
          desc,
          reqs,
          sector,
          profession,
          skills: formattedSkills,
          isActive,
        });
      }
    }

    // Execute in parallel batches of CONCURRENCY
    for (let i = 0; i < updates.length; i += CONCURRENCY) {
      const slice = updates.slice(i, i + CONCURRENCY);
      await Promise.all(slice.map(u => sql`
        UPDATE jobs SET
          description = ${u.desc},
          requirements = ${u.reqs},
          sector = ${u.sector},
          profession = ${u.profession},
          skills = ${u.skills}::text[],
          is_active = ${u.isActive},
          updated_at = NOW()
        WHERE id = ${u.id}
      `));
      totalUpdated += slice.length;
    }

    processed += rows.length;
    const elapsedSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    const speed = Math.round(processed / elapsedSec);
    console.log(`[Enrichment] Processed: ${processed}/${total} | Updated: ${totalUpdated} | Rate: ${speed} rows/sec | Elapsed: ${elapsedSec}s`);
  }

  console.log(`\n\n🎉 Full Database Fast-Pass Complete!`);
  console.log(`   Total Updated:       ${totalUpdated}`);
  console.log(`   CF Emails Decoded:   ${cfDecoded}`);
  console.log(`   Requirements Added:  ${reqsExtracted}`);
  console.log(`   Deactivated Expired: ${expiredDeactivated}`);

  await sql.end();
}

run().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
