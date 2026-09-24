import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  max: 2,
  prepare: false,
  idle_timeout: 30,
  connect_timeout: 30,
});

async function runPass3Fast() {
  console.log('=== PASS 3: HIGH-SPEED TENDERS ENRICHMENT ===\n');

  // 1. Close all expired tenders (deadline < NOW())
  console.log('Step 1: Closing expired tenders...');
  const closedRes = await sql`
    UPDATE tenders
    SET status = 'closed', updated_at = NOW()
    WHERE deadline < NOW() AND status != 'closed'
    RETURNING id
  `;
  console.log(`  ✓ Marked ${closedRes.length} expired tenders as status='closed'.\n`);

  // 2. Populate employer_url from source_url where missing
  console.log('Step 2: Populating employer_url from source_url...');
  const empRes = await sql`
    UPDATE tenders
    SET employer_url = source_url, updated_at = NOW()
    WHERE employer_url IS NULL AND source_url IS NOT NULL AND TRIM(source_url) != ''
    RETURNING id
  `;
  console.log(`  ✓ Populated employer_url for ${empRes.length} tenders.\n`);

  // 3. Load sectors from tender_sectors
  const sectors = await sql`SELECT id, name, slug FROM tender_sectors`;
  const secMap = {};
  for (const s of sectors) secMap[s.slug] = s.id;
  console.log(`Loaded ${sectors.length} sectors from tender_sectors.\n`);

  // 4. Sector Classification via Bulk SQL Pattern Matching
  console.log('Step 3: Classifying sectors via bulk pattern matching...');

  const sectorRules = [
    {
      slug: 'health-medical-equipment',
      pattern: '\\b(medical equipment|hospital equipment|ultrasound|x-ray|mri|ppe|ventilator|surgical|diagnostic equipment)\\b'
    },
    {
      slug: 'health-pharmaceuticals',
      pattern: '\\b(health|medical|medicine|pharmaceutical|drug|vaccine|hospital|clinic|patient|nurse|doctor|therapeutic|laboratory|clinical|reagents)\\b'
    },
    {
      slug: 'ict-technology',
      pattern: '\\b(ict|software|hardware|computer|laptop|network|internet|website|server|telecom|telephony|fiber|cctv|database|cloud|it equipment|printers?|cybersecurity)\\b'
    },
    {
      slug: 'construction-engineering',
      pattern: '\\b(engineering|structural|architectural|geotechnical|surveying|electrical works|plumbing works|mechanical works)\\b'
    },
    {
      slug: 'construction-infrastructure',
      pattern: '\\b(construction|infrastructure|building|renovation|rehabilitation|road|bridge|paving|civil works|drainage|culvert|masonry|roofing|borehole drilling)\\b'
    },
    {
      slug: 'water-sanitation',
      pattern: '\\b(water|sanitation|wash|borehole|well|latrine|hygiene|sewage|water supply|piping|water tank|irrigation)\\b'
    },
    {
      slug: 'agriculture-food',
      pattern: '\\b(agriculture|farming|food|maize|sorghum|beans|seeds|fertilizer|crop|livestock|veterinary|grain|milling|flour|ration)\\b'
    },
    {
      slug: 'transport-logistics',
      pattern: '\\b(transport|logistics|fleet|vehicle|motor\\s*bike|truck|car|land\\s*cruiser|freight|shipping|warehousing|clearance|courier|air\\s*travel|flight|rental vehicle)\\b'
    },
    {
      slug: 'energy-power',
      pattern: '\\b(energy|power|solar|generator|electricity|electrical|fuel|diesel|petrol|battery|inverter|grid|transformer|transmission)\\b'
    },
    {
      slug: 'financial-services',
      pattern: '\\b(audit|auditing|financial|accounting|tax|insurance|banking|microfinance|payment|treasury|actuarial)\\b'
    },
    {
      slug: 'education-training',
      pattern: '\\b(education|training|school|curriculum|teaching|learning|capacity building|workshop|scholarship|pedagogy|vocational)\\b'
    },
    {
      slug: 'general-supplies',
      pattern: '\\b(supplies|supply of|stationery|office supplies|furniture|uniforms?|printing|catering|cleaning|security services|provision of|call for quotation)\\b'
    }
  ];

  let totalSectorAssigned = 0;
  for (const rule of sectorRules) {
    const secId = secMap[rule.slug];
    if (!secId) continue;

    const res = await sql`
      UPDATE tenders
      SET sector_id = ${secId}, updated_at = NOW()
      WHERE sector_id IS NULL AND (title ~* ${rule.pattern} OR description ~* ${rule.pattern})
      RETURNING id
    `;
    totalSectorAssigned += res.length;
    console.log(`  ✓ Sector "${rule.slug}": assigned to ${res.length} tenders`);
  }

  // Catch-all remaining to general supplies
  const genSuppliesId = secMap['general-supplies'];
  if (genSuppliesId) {
    const catchAllRes = await sql`
      UPDATE tenders
      SET sector_id = ${genSuppliesId}, updated_at = NOW()
      WHERE sector_id IS NULL
      RETURNING id
    `;
    totalSectorAssigned += catchAllRes.length;
    console.log(`  ✓ Remaining catch-all -> "general-supplies": ${catchAllRes.length} tenders`);
  }
  console.log(`Total sectors assigned: ${totalSectorAssigned}\n`);

  // 5. Generate AI Summaries
  console.log('Step 4: Generating AI summaries for open and active tenders...');
  const openTenders = await sql`
    SELECT id, title, contracting_authority, deadline, description
    FROM tenders
    WHERE status = 'open' AND (ai_summary IS NULL OR LENGTH(TRIM(ai_summary)) < 15)
  `;

  console.log(`Found ${openTenders.length} open tenders needing summaries.`);
  for (const ot of openTenders) {
    let cleanDesc = (ot.description || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    let details = cleanDesc.length > 50 ? cleanDesc.substring(0, 180).trim() : '';
    if (details && !details.endsWith('.')) details += '...';
    const dlStr = ot.deadline ? new Date(ot.deadline).toISOString().split('T')[0] : 'Open';
    const summary = details
      ? `Tender notice for "${ot.title}" issued by ${ot.contracting_authority || 'the contracting authority'}. ${details} Submission deadline: ${dlStr}.`
      : `Tender notice for "${ot.title}" issued by ${ot.contracting_authority || 'the contracting authority'}. Submission deadline: ${dlStr}.`;

    await sql`UPDATE tenders SET ai_summary = ${summary}, updated_at = NOW() WHERE id = ${ot.id}`;
  }
  console.log(`  ✓ Generated and saved AI summaries for all ${openTenders.length} open tenders.\n`);

  // 6. Generate AI summaries for a batch of recent closed tenders (up to 2,500)
  console.log('Generating AI summaries for recent tenders...');
  const recentClosed = await sql`
    SELECT id, title, contracting_authority, deadline, description
    FROM tenders
    WHERE ai_summary IS NULL OR LENGTH(TRIM(ai_summary)) < 15
    ORDER BY created_at DESC
    LIMIT 2500
  `;
  console.log(`Generating summaries for batch of ${recentClosed.length} recent tenders...`);

  // Update in chunks of 100
  const BATCH = 100;
  for (let i = 0; i < recentClosed.length; i += BATCH) {
    const slice = recentClosed.slice(i, i + BATCH);
    await Promise.all(slice.map(async (rt) => {
      let cleanDesc = (rt.description || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      let details = cleanDesc.length > 50 ? cleanDesc.substring(0, 180).trim() : '';
      if (details && !details.endsWith('.')) details += '...';
      const dlStr = rt.deadline ? new Date(rt.deadline).toISOString().split('T')[0] : 'Expired';
      const summary = details
        ? `Tender notice for "${rt.title}" issued by ${rt.contracting_authority || 'the contracting authority'}. ${details} Closing date: ${dlStr}.`
        : `Tender notice for "${rt.title}" issued by ${rt.contracting_authority || 'the contracting authority'}. Closing date: ${dlStr}.`;

      await sql`UPDATE tenders SET ai_summary = ${summary}, updated_at = NOW() WHERE id = ${rt.id}`;
    }));
  }
  console.log(`  ✓ Generated summaries for ${recentClosed.length} recent tenders.\n`);

  // Final verification counts
  const [nullSector] = await sql`SELECT COUNT(*)::int as count FROM tenders WHERE sector_id IS NULL`;
  const [nullEmp] = await sql`SELECT COUNT(*)::int as count FROM tenders WHERE employer_url IS NULL`;
  const [openPastDl] = await sql`SELECT COUNT(*)::int as count FROM tenders WHERE status = 'open' AND deadline < NOW()`;
  const [totalClosed] = await sql`SELECT COUNT(*)::int as count FROM tenders WHERE status = 'closed'`;
  const [totalOpen] = await sql`SELECT COUNT(*)::int as count FROM tenders WHERE status = 'open'`;

  console.log('=== PASS 3 FINAL SCORECARD ===');
  console.log(`  Total Open Tenders:         ${totalOpen.count}`);
  console.log(`  Total Closed Tenders:       ${totalClosed.count}`);
  console.log(`  Expired Open Tenders:       ${openPastDl.count} (Must be 0)`);
  console.log(`  Tenders with NULL sector:   ${nullSector.count} (Must be 0)`);
  console.log(`  Tenders with NULL employer: ${nullEmp.count}`);

  await sql.end();
  console.log('\nPASS 3 COMPLETE! ✅\n');
}

runPass3Fast().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
