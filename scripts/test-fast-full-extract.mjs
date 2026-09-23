import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 2 });

const sampleRows = await sql`
  SELECT id, title, company_name, description, requirements, deadline, is_active, sector, profession, skills
  FROM jobs
  WHERE (requirements IS NULL OR requirements = '') AND description IS NOT NULL AND LENGTH(description) > 100
  LIMIT 10
`;

// Sector taxonomy
const SECTORS = [
  { name: 'Information Technology & Software', keywords: ['software', 'developer', 'frontend', 'backend', 'fullstack', 'devops', 'database', 'cyber', 'network', 'system admin', 'data analyst', 'data engineer', 'python', 'java', 'react', 'programmer', 'ict', 'computer science'] },
  { name: 'Healthcare & Pharmaceuticals', keywords: ['health', 'medical', 'nurse', 'doctor', 'physician', 'pharmacist', 'pharmacy', 'clinical', 'hospital', 'dental', 'laboratory', 'nursing', 'midwife', 'patient', 'clinic'] },
  { name: 'Finance, Banking & Insurance', keywords: ['accountant', 'accounting', 'finance', 'banking', 'auditor', 'audit', 'credit', 'loan', 'microfinance', 'insurance', 'treasury', 'tax', 'cashier', 'actuarial', 'teller'] },
  { name: 'Education & Training', keywords: ['teacher', 'teaching', 'lecturer', 'tutor', 'academic', 'professor', 'school', 'curriculum', 'education', 'instructor', 'headmaster', 'principal'] },
  { name: 'Manufacturing, Construction & Engineering', keywords: ['civil engineer', 'mechanical engineer', 'electrical engineer', 'technician', 'construction', 'architect', 'manufacturing', 'plant', 'mechanic', 'plumber', 'welder', 'fitter', 'operator', 'site engineer', 'surveyor'] },
  { name: 'NGO, Development & Social Services', keywords: ['ngo', 'non-profit', 'humanitarian', 'grant', 'monitoring and evaluation', 'm&e', 'community mobilization', 'program officer', 'project officer', 'unicef', 'usaid', 'who', 'social work'] },
  { name: 'Sales, Marketing & Customer Support', keywords: ['sales', 'marketing', 'business development', 'customer care', 'customer service', 'digital marketing', 'brand manager', 'retail', 'call centre', 'call center', 'commercial'] },
  { name: 'Logistics, Transport & Procurement', keywords: ['procurement', 'supply chain', 'logistics', 'driver', 'warehouse', 'inventory', 'clearing', 'forwarding', 'fleet', 'transport', 'shipping'] },
  { name: 'Legal, Compliance & HR', keywords: ['human resources', 'hr officer', 'talent acquisition', 'recruiter', 'recruitment', 'legal counsel', 'lawyer', 'advocate', 'compliance', 'regulatory'] },
  { name: 'Hospitality, Tourism & Catering', keywords: ['chef', 'cook', 'hotel', 'waiter', 'waitress', 'housekeeping', 'tourism', 'tour guide', 'receptionist', 'hospitality', 'restaurant', 'food & beverage'] },
  { name: 'Agriculture, Mining & Energy', keywords: ['agriculture', 'agronomy', 'farm', 'agribusiness', 'crop', 'mining', 'geologist', 'mineral', 'oil & gas', 'solar', 'renewable energy'] }
];

const SKILLS_LIST = [
  'python', 'javascript', 'typescript', 'react', 'node.js', 'sql', 'excel', 'word', 'powerpoint',
  'accounting', 'financial analysis', 'financial reporting', 'data analysis', 'customer service',
  'sales', 'project management', 'communication skills', 'public speaking', 'english', 'swahili',
  'french', 'budgeting', 'monitoring and evaluation', 'procurement', 'contract management',
  'graphic design', 'social media', 'digital marketing', 'team leadership', 'negotiation',
  'problem solving', 'time management', 'human resources', 'payroll', 'recruitment', 'driving',
  'first aid', 'inventory management', 'auditing', 'taxation', 'report writing', 'analytical skills',
  'risk management', 'supply chain management', 'strategic planning', 'relationship management'
];

function extractSector(title, desc) {
  const combined = `${title || ''} ${desc || ''}`.toLowerCase();
  for (const s of SECTORS) {
    if (s.keywords.some(k => combined.includes(k))) {
      return s.name;
    }
  }
  return 'General Business & Operations';
}

function extractSkills(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const matched = [];
  for (const skill of SKILLS_LIST) {
    // Word boundary match
    const regex = new RegExp(`\\b${skill.replace('.', '\\.')}\\b`, 'i');
    if (regex.test(lower)) {
      matched.push(skill);
    }
  }
  return matched.slice(0, 10);
}

function extractRequirements(text) {
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
    return items.slice(0, 12).join('\n• ');
  }
  return null;
}

console.log('Testing requirements, sector, and skills extraction:\n');
for (const row of sampleRows) {
  const req = extractRequirements(row.description);
  const sector = extractSector(row.title, row.description);
  const skills = extractSkills(`${row.title} ${row.description}`);

  console.log(`Title:    ${row.title}`);
  console.log(`Sector:   ${sector}`);
  console.log(`Skills:   ${skills.join(', ') || '(none detected)'}`);
  console.log(`Reqs:     ${req ? `${req.substring(0, 150)}...` : '(none extracted from desc)'}`);
  console.log('---');
}

await sql.end();
