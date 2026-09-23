import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 10, prepare: false });

// ── CLOUDFLARE EMAIL DECODER ──────────────────────────────────────────────────
function decodeCfEmail(hex) {
  if (!hex || hex.length < 4) return null;
  try {
    const r = parseInt(hex.substring(0, 2), 16);
    let email = '';
    for (let i = 2; i < hex.length; i += 2) {
      email += String.fromCharCode(parseInt(hex.substring(i, i + 2), 16) ^ r);
    }
    return email && email.includes('@') && email.includes('.') ? email : null;
  } catch { return null; }
}

// ── SECTOR TAXONOMY ───────────────────────────────────────────────────────────
const SECTORS = [
  { name: 'Information Technology & Software', profession: 'IT & Software Engineering', keywords: ['software', 'developer', 'frontend', 'backend', 'fullstack', 'devops', 'database', 'cyber', 'network', 'system admin', 'data analyst', 'data engineer', 'python', 'java', 'react', 'programmer', 'ict', 'computer science', 'it officer', 'it support', 'web designer', 'scrum'] },
  { name: 'Healthcare & Pharmaceuticals', profession: 'Healthcare & Medicine', keywords: ['health', 'medical', 'nurse', 'doctor', 'physician', 'pharmacist', 'pharmacy', 'clinical', 'hospital', 'dental', 'laboratory', 'nursing', 'midwife', 'patient', 'clinic', 'biomedical'] },
  { name: 'Finance, Banking & Insurance', profession: 'Accounting & Finance', keywords: ['accountant', 'accounting', 'finance', 'banking', 'auditor', 'audit', 'credit', 'loan', 'microfinance', 'insurance', 'treasury', 'tax', 'cashier', 'actuarial', 'teller', 'financial analyst', 'reconciliation'] },
  { name: 'Education & Training', profession: 'Teaching & Education', keywords: ['teacher', 'teaching', 'lecturer', 'tutor', 'academic', 'professor', 'school', 'curriculum', 'education', 'instructor', 'headmaster', 'principal'] },
  { name: 'Manufacturing, Construction & Engineering', profession: 'Engineering & Construction', keywords: ['civil engineer', 'mechanical engineer', 'electrical engineer', 'technician', 'construction', 'architect', 'manufacturing', 'plant', 'mechanic', 'plumber', 'welder', 'fitter', 'operator', 'site engineer', 'surveyor', 'mining engineer'] },
  { name: 'NGO, Development & Social Services', profession: 'Community & Social Development', keywords: ['ngo', 'non-profit', 'humanitarian', 'grant', 'monitoring and evaluation', 'm&e', 'community mobilization', 'program officer', 'project officer', 'social work'] },
  { name: 'Sales, Marketing & Customer Support', profession: 'Sales & Marketing', keywords: ['sales', 'marketing', 'business development', 'customer care', 'customer service', 'digital marketing', 'brand manager', 'retail', 'call centre', 'call center', 'commercial', 'telesales', 'merchandiser'] },
  { name: 'Logistics, Transport & Procurement', profession: 'Logistics & Supply Chain', keywords: ['procurement', 'supply chain', 'logistics', 'driver', 'warehouse', 'inventory', 'clearing', 'forwarding', 'fleet', 'transport', 'shipping', 'storekeeper'] },
  { name: 'Legal, Compliance & HR', profession: 'Human Resources & Legal', keywords: ['human resources', 'hr officer', 'talent acquisition', 'recruiter', 'recruitment', 'legal counsel', 'lawyer', 'advocate', 'compliance', 'regulatory', 'aml'] },
  { name: 'Hospitality, Tourism & Catering', profession: 'Hospitality & Tourism', keywords: ['chef', 'cook', 'hotel', 'waiter', 'waitress', 'housekeeping', 'tourism', 'tour guide', 'receptionist', 'hospitality', 'restaurant', 'food & beverage', 'barista'] },
  { name: 'Agriculture, Mining & Energy', profession: 'Agriculture & Natural Resources', keywords: ['agriculture', 'agronomy', 'farm', 'agribusiness', 'crop', 'mining', 'geologist', 'mineral', 'oil & gas', 'solar', 'renewable energy', 'livestock', 'veterinary'] },
];

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

function classifySector(title, desc) {
  const combined = `${title || ''} ${desc || ''}`.toLowerCase();
  for (const s of SECTORS) {
    if (s.keywords.some(k => combined.includes(k))) return { sector: s.name, profession: s.profession };
  }
  return { sector: 'General Business & Operations', profession: 'Operations & Administration' };
}

function extractSkills(text) {
  if (!text) return ['Communication', 'Problem Solving'];
  const lower = text.toLowerCase();
  const matched = SKILLS_MAP.filter(s => new RegExp(`\\b${s.replace('.', '\\.')}\\b`, 'i').test(lower));
  return matched.length > 0 ? matched.slice(0, 10) : ['Communication', 'Problem Solving', 'Teamwork'];
}

function extractRequirements(text) {
  if (!text || text.length < 50) return null;
  const lines = text.split(/\r?\n/);
  const items = [];
  let inReq = false;
  const startRx = /(?:requirements|qualifications|experience|skills|eligibility|what\s+you\s+need|vigezo|exigences)/i;
  const endRx = /(?:how\s+to\s+apply|benefits|remuneration|salary|jinsi\s+ya\s+kuomba|about\s+the\s+company)/i;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const isBullet = /^[-*•–—]\s+(.+)/.exec(line) || /^\d+[.)]\s+(.+)/.exec(line) || /^[a-z][.)]\s+(.+)/i.exec(line);
    if (isBullet) { const c = isBullet[1].trim(); if (c.length >= 8 && c.length <= 400) items.push(c); continue; }
    if (startRx.test(line)) { inReq = true; continue; }
    if (inReq && endRx.test(line)) { inReq = false; break; }
    if (inReq && line.length >= 15 && line.length <= 300) items.push(line);
  }
  return items.length >= 2 ? items.slice(0, 12).map(i => `• ${i}`).join('\n') : null;
}

function fmtArray(arr) {
  return `{${arr.map(s => `"${s.replace(/"/g, '\\"')}"`).join(',')}}`;
}

// ── MAIN — OFFSET-BASED PAGINATION OVER ALL 16,864 JOBS ─────────────────────
async function run() {
  const [totalRes] = await sql`SELECT COUNT(*)::int as count FROM jobs`;
  const TOTAL = totalRes.count;
  const CHUNK = 500;
  const CONCURRENCY = 20;
  let offset = 0, totalUpdated = 0, cfDecoded = 0, reqsExtracted = 0, expiredDeactivated = 0;
  const now = new Date();
  const startTime = Date.now();

  console.log(`Starting OFFSET-based enrichment over all ${TOTAL} jobs. Chunk: ${CHUNK}, Concurrency: ${CONCURRENCY}\n`);

  while (offset < TOTAL) {
    const rows = await sql`
      SELECT id, title, description, requirements, sector, profession, skills, deadline, is_active
      FROM jobs
      ORDER BY id
      LIMIT ${CHUNK} OFFSET ${offset}
    `;
    if (rows.length === 0) break;

    const updates = [];

    for (const row of rows) {
      let desc = row.description || '';
      let reqs = row.requirements;
      let sector = row.sector;
      let profession = row.profession;
      let skills = row.skills;
      let isActive = row.is_active;
      let changed = false;

      // 1. Decode Cloudflare emails in description
      const cfHexMatches = desc.match(/data-cfemail=["']([a-f0-9]+)["']/gi);
      if (cfHexMatches) {
        for (const m of cfHexMatches) {
          const hex = m.replace(/data-cfemail=["']|["']/gi, '');
          const email = decodeCfEmail(hex);
          if (email) { desc = desc.replace('[email protected]', email); cfDecoded++; changed = true; }
        }
      }

      // 2. Extract requirements if missing/empty
      if (!reqs || reqs.trim().length < 20) {
        const extracted = extractRequirements(desc);
        if (extracted) { reqs = extracted; reqsExtracted++; changed = true; }
        else if (!reqs) { reqs = ''; changed = true; } // Mark as processed (empty string so it's no longer NULL)
      }

      // 3. Classify sector/profession if missing
      if (!sector || !profession) {
        const cl = classifySector(row.title, desc);
        sector = sector || cl.sector;
        profession = profession || cl.profession;
        changed = true;
      }

      // 4. Extract skills if missing
      if (!skills || skills.length === 0) {
        skills = extractSkills(`${row.title} ${desc} ${reqs || ''}`);
        changed = true;
      }

      // 5. Deactivate expired jobs
      if (row.deadline && new Date(row.deadline) < now && isActive !== false) {
        isActive = false;
        expiredDeactivated++;
        changed = true;
      }

      if (changed) {
        updates.push({ id: row.id, desc, reqs: reqs || '', sector, profession, skills, isActive });
      }
    }

    // Execute updates in parallel batches
    for (let i = 0; i < updates.length; i += CONCURRENCY) {
      const slice = updates.slice(i, i + CONCURRENCY);
      await Promise.all(slice.map(u => sql`
        UPDATE jobs SET
          description  = ${u.desc},
          requirements = ${u.reqs},
          sector       = ${u.sector},
          profession   = ${u.profession},
          skills       = ${fmtArray(u.skills)}::text[],
          is_active    = ${u.isActive},
          updated_at   = NOW()
        WHERE id = ${u.id}
      `));
      totalUpdated += slice.length;
    }

    offset += rows.length;
    const elapsedSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    const pct = ((offset / TOTAL) * 100).toFixed(1);
    const eta = Math.round(((TOTAL - offset) / Math.max(1, offset)) * elapsedSec);
    process.stdout.write(`\r[${pct}%] ${offset}/${TOTAL} | Updated: ${totalUpdated} | CFEmails: ${cfDecoded} | Reqs: ${reqsExtracted} | Expired: ${expiredDeactivated} | ${Math.round(offset / elapsedSec)} rows/s | ETA: ${eta}s`);
  }

  console.log(`\n\n🎉 Enrichment complete!`);
  console.log(`   Total updated:         ${totalUpdated}`);
  console.log(`   CF emails decoded:     ${cfDecoded}`);
  console.log(`   Requirements extracted:${reqsExtracted}`);
  console.log(`   Expired deactivated:   ${expiredDeactivated}`);

  await sql.end();
}

run().catch(async (e) => { console.error(e); await sql.end(); process.exit(1); });
