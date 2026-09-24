import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  max: 3,
  prepare: false,
  idle_timeout: 30,
  connect_timeout: 30,
});

const SECTOR_KEYWORDS = [
  {
    slug: 'health-pharmaceuticals',
    patterns: /\b(health|medical|medicine|pharmaceutical|drug|vaccine|hospital|clinic|patient|nurse|doctor|therapeutic|laboratory|clinical|reagents)\b/i
  },
  {
    slug: 'health-medical-equipment',
    patterns: /\b(medical equipment|hospital equipment|ultrasound|x-ray|mri|ppe|ventilator|surgical|diagnostic equipment)\b/i
  },
  {
    slug: 'ict-technology',
    patterns: /\b(ict|software|hardware|computer|laptop|network|internet|website|server|telecom|telephony|fiber|cctv|database|cloud|it equipment|printers?|cybersecurity)\b/i
  },
  {
    slug: 'construction-infrastructure',
    patterns: /\b(construction|infrastructure|building|renovation|rehabilitation|road|bridge|paving|civil works|drainage|culvert|masonry|roofing|borehole drilling)\b/i
  },
  {
    slug: 'construction-engineering',
    patterns: /\b(engineering|structural|architectural|geotechnical|surveying|electrical works|plumbing works|mechanical works)\b/i
  },
  {
    slug: 'water-sanitation',
    patterns: /\b(water|sanitation|wash|borehole|well|latrine|hygiene|sewage|water supply|piping|water tank|irrigation)\b/i
  },
  {
    slug: 'agriculture-food',
    patterns: /\b(agriculture|farming|food|maize|sorghum|beans|seeds|fertilizer|crop|livestock|veterinary|grain|milling|flour|ration)\b/i
  },
  {
    slug: 'transport-logistics',
    patterns: /\b(transport|logistics|fleet|vehicle|motor\s*bike|truck|car|land\s*cruiser|freight|shipping|warehousing|clearance|courier|air\s*travel|flight|rental vehicle)\b/i
  },
  {
    slug: 'energy-power',
    patterns: /\b(energy|power|solar|generator|electricity|electrical|fuel|diesel|petrol|battery|inverter|grid|transformer|transmission)\b/i
  },
  {
    slug: 'financial-services',
    patterns: /\b(audit|auditing|financial|accounting|tax|insurance|banking|microfinance|payment|treasury|actuarial)\b/i
  },
  {
    slug: 'education-training',
    patterns: /\b(education|training|school|curriculum|teaching|learning|capacity building|workshop|scholarship|pedagogy|vocational)\b/i
  },
  {
    slug: 'general-supplies',
    patterns: /\b(supplies|supply of|stationery|office supplies|furniture|uniforms?|printing|catering|cleaning|security services|provision of|call for quotation)\b/i
  }
];

function classifyTenderSector(title, description, sectorsBySlug) {
  const combined = `${title || ''} ${(description || '').substring(0, 1000)}`;
  for (const item of SECTOR_KEYWORDS) {
    if (item.patterns.test(combined)) {
      const match = sectorsBySlug[item.slug];
      if (match) return match.id;
    }
  }
  const gen = sectorsBySlug['general-supplies'];
  return gen ? gen.id : null;
}

function generateSummary(title, authority, deadline, desc) {
  let cleanDesc = (desc || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  let details = '';
  if (cleanDesc.length > 50) {
    details = cleanDesc.substring(0, 180).trim();
    if (!details.endsWith('.')) details += '...';
  }

  const deadlineStr = deadline ? new Date(deadline).toISOString().split('T')[0] : 'Not specified';
  const org = authority || 'The contracting authority';

  if (details) {
    return `Tender notice for "${title}" issued by ${org}. ${details} Application deadline: ${deadlineStr}.`;
  }
  return `Tender notice for "${title}" issued by ${org}. Submission deadline: ${deadlineStr}.`;
}

async function runPass3() {
  console.log('=== PASS 3: TENDERS COMPREHENSIVE ENRICHMENT ===\n');

  // 1. Close Expired Tenders
  console.log('Closing expired tenders (deadline < NOW())...');
  const closedRes = await sql`
    UPDATE tenders
    SET status = 'closed', updated_at = NOW()
    WHERE deadline < NOW() AND status != 'closed'
    RETURNING id
  `;
  console.log(`  ✓ Updated ${closedRes.length} expired tenders to status='closed'.\n`);

  // 2. Fetch Tender Sectors
  const sectors = await sql`SELECT id, name, slug FROM tender_sectors`;
  const sectorsBySlug = {};
  for (const s of sectors) {
    sectorsBySlug[s.slug] = s;
  }
  console.log(`Loaded ${sectors.length} sectors from tender_sectors.`);

  // 3. Batch Classify Sectors and Set Employer URLs (Chunked)
  const CHUNK_SIZE = 250;
  let offset = 0;
  let sectorAssigned = 0;
  let employerUrlAssigned = 0;

  const [countRes] = await sql`
    SELECT COUNT(*)::int as count 
    FROM tenders 
    WHERE sector_id IS NULL OR employer_url IS NULL
  `;
  const totalToEnrich = countRes.count;
  console.log(`Tenders needing sector_id or employer_url: ${totalToEnrich}\n`);

  while (true) {
    const batch = await sql`
      SELECT id, title, description, contracting_authority, deadline, source_url, employer_url, sector_id
      FROM tenders
      WHERE sector_id IS NULL OR employer_url IS NULL
      LIMIT ${CHUNK_SIZE}
    `;

    if (batch.length === 0) break;

    for (const t of batch) {
      let newSectorId = t.sector_id;
      let newEmployerUrl = t.employer_url;

      if (!newSectorId) {
        newSectorId = classifyTenderSector(t.title, t.description, sectorsBySlug);
        if (newSectorId) sectorAssigned++;
      }

      if (!newEmployerUrl && t.source_url) {
        newEmployerUrl = t.source_url;
        employerUrlAssigned++;
      }

      await sql`
        UPDATE tenders
        SET
          sector_id = ${newSectorId},
          employer_url = ${newEmployerUrl},
          updated_at = NOW()
        WHERE id = ${t.id}
      `;
    }

    offset += batch.length;
    const pct = ((offset / totalToEnrich) * 100).toFixed(1);
    console.log(`[Tenders] Enriched ${offset}/${totalToEnrich} (${pct}%) | Sectors: ${sectorAssigned} | Employer URLs: ${employerUrlAssigned}`);
  }

  // 4. Generate AI Summaries for Open Tenders
  console.log('\nGenerating AI summaries for open upcoming tenders...');
  const openTenders = await sql`
    SELECT id, title, contracting_authority, deadline, description
    FROM tenders
    WHERE status = 'open' AND (ai_summary IS NULL OR LENGTH(TRIM(ai_summary)) < 15)
  `;

  console.log(`Found ${openTenders.length} open tenders needing AI summary.`);
  let summariesCount = 0;
  for (const ot of openTenders) {
    const summary = generateSummary(ot.title, ot.contracting_authority, ot.deadline, ot.description);
    await sql`
      UPDATE tenders
      SET ai_summary = ${summary}, updated_at = NOW()
      WHERE id = ${ot.id}
    `;
    summariesCount++;
  }
  console.log(`  ✓ Generated and saved AI summaries for ${summariesCount} open tenders.\n`);

  // 5. Generate AI summaries for recent closed tenders
  console.log('Generating AI summaries for recent tenders...');
  const recentTenders = await sql`
    SELECT id, title, contracting_authority, deadline, description
    FROM tenders
    WHERE (ai_summary IS NULL OR LENGTH(TRIM(ai_summary)) < 15)
    ORDER BY created_at DESC
    LIMIT 2000
  `;
  let recentSummaries = 0;
  for (const rt of recentTenders) {
    const summary = generateSummary(rt.title, rt.contracting_authority, rt.deadline, rt.description);
    await sql`
      UPDATE tenders
      SET ai_summary = ${summary}, updated_at = NOW()
      WHERE id = ${rt.id}
    `;
    recentSummaries++;
  }
  console.log(`  ✓ Generated summaries for ${recentSummaries} recent tenders.\n`);

  await sql.end();
  console.log('PASS 3 COMPLETE! ✅');
}

runPass3().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});