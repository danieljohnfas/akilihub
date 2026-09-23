import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 3, prepare: false });

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
    keywords: ['software', 'developer', 'frontend', 'backend', 'fullstack', 'devops', 'database', 'cyber', 'network', 'system admin', 'data analyst', 'data engineer', 'python', 'java', 'react', 'programmer', 'ict', 'computer science', 'it officer', 'it support', 'web designer'],
    defaultProfession: 'IT & Software Engineering',
  },
  {
    name: 'Healthcare & Pharmaceuticals',
    keywords: ['health', 'medical', 'nurse', 'doctor', 'physician', 'pharmacist', 'pharmacy', 'clinical', 'hospital', 'dental', 'laboratory', 'nursing', 'midwife', 'patient', 'clinic', 'biomedical', 'epidemiology'],
    defaultProfession: 'Healthcare & Medicine',
  },
  {
    name: 'Finance, Banking & Insurance',
    keywords: ['accountant', 'accounting', 'finance', 'banking', 'auditor', 'audit', 'credit', 'loan', 'microfinance', 'insurance', 'treasury', 'tax', 'cashier', 'actuarial', 'teller', 'financial analyst'],
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
    keywords: ['human resources', 'hr officer', 'talent acquisition', 'recruiter', 'recruitment', 'legal counsel', 'lawyer', 'advocate', 'compliance', 'regulatory', 'legal officer'],
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

// ── 4. BATCH ENRICHMENT RUNNER ─────────────────────────────────────────────────
async function run() {
  console.log('Starting full-database fast-pass enrichment across all jobs...\n');

  const [totalRes] = await sql`SELECT COUNT(*)::int as count FROM jobs`;
  const total = totalRes.count;
  console.log(`Total jobs to process: ${total}`);

  const CHUNK_SIZE = 250;
  let offset = 0;
  let updatedCount = 0;
  let cfDecodedCount = 0;
  let reqsAddedCount = 0;
  let expiredCount = 0;
  const now = new Date();

  while (offset < total) {
    const rows = await sql`
      SELECT id, title, description, requirements, sector, profession, skills, deadline, is_active
      FROM jobs
      ORDER BY id
      LIMIT ${CHUNK_SIZE} OFFSET ${offset}
    `;

    if (rows.length === 0) break;

    for (const row of rows) {
      let desc = row.description || '';
      let reqs = row.requirements || null;
      let sector = row.sector;
      let profession = row.profession;
      let skills = row.skills;
      let isActive = row.is_active;
      let changed = false;

      // 1. Decode Cloudflare emails in description
      if (desc && (desc.includes('[email protected]') || desc.includes('data-cfemail='))) {
        const hexMatches = desc.match(/data-cfemail=["']([a-f0-9]+)["']/gi) || desc.match(/\/email-protection#([a-f0-9]+)/gi);
        if (hexMatches) {
          for (const m of hexMatches) {
            const hex = m.replace(/data-cfemail=["']|["']|\/email-protection#/gi, '');
            const email = decodeCloudflareEmail(hex);
            if (email) {
              desc = desc.replace('[email protected]', email).replace(m, email);
              cfDecodedCount++;
              changed = true;
            }
          }
        }
      }

      // 2. Extract requirements from description if empty
      if ((!reqs || reqs.trim().length < 20) && desc) {
        const extractedReqs = extractStructuredRequirements(desc);
        if (extractedReqs) {
          reqs = extractedReqs;
          reqsAddedCount++;
          changed = true;
        }
      }

      // 3. Classify sector & profession if missing
      if (!sector || !profession) {
        const classified = classifySectorAndProfession(row.title, desc);
        sector = sector || classified.sector;
        profession = profession || classified.profession;
        changed = true;
      }

      // 4. Extract skills if missing
      if (!skills || skills.length === 0) {
        const extractedSkills = extractSkills(`${row.title} ${desc} ${reqs || ''}`);
        if (extractedSkills.length > 0) {
          skills = extractedSkills;
          changed = true;
        }
      }

      // 5. Deactivate expired jobs
      if (row.deadline && new Date(row.deadline) < now && isActive !== false) {
        isActive = false;
        expiredCount++;
        changed = true;
      }

      // 6. Update row if changes occurred
      if (changed) {
        const formattedSkills = skills && skills.length > 0
          ? `{${skills.map(s => `"${s.replace(/"/g, '\\"')}"`).join(',')}}`
          : null;

        await sql`
          UPDATE jobs SET
            description = ${desc},
            requirements = ${reqs},
            sector = ${sector},
            profession = ${profession},
            skills = ${formattedSkills}::text[],
            is_active = ${isActive},
            updated_at = NOW()
          WHERE id = ${row.id}
        `;
        updatedCount++;
      }
    }

    offset += rows.length;
    process.stdout.write(`\rProgress: ${offset} / ${total} (${((offset / total) * 100).toFixed(1)}%) — Updated: ${updatedCount}, CF Emails: ${cfDecodedCount}, Reqs Added: ${reqsAddedCount}, Expired: ${expiredCount}`);
  }

  console.log(`\n\n✅ Bulk Fast-Pass Complete!`);
  console.log(`   Total Records Updated:   ${updatedCount}`);
  console.log(`   Cloudflare Emails Decoded: ${cfDecodedCount}`);
  console.log(`   Requirements Added:      ${reqsAddedCount}`);
  console.log(`   Expired Jobs Deactivated: ${expiredCount}`);

  await sql.end();
}

run().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
