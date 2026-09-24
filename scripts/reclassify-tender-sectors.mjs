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

async function reclassifySectors() {
  console.log('=== PRECISE SECTOR CLASSIFICATION FOR TENDERS (USING POSIX \\y) ===\n');

  const sectors = await sql`SELECT id, name, slug FROM tender_sectors`;
  const secMap = {};
  for (const s of sectors) secMap[s.slug] = s.id;

  const rules = [
    {
      slug: 'health-medical-equipment',
      pattern: '\\y(medical equipment|hospital equipment|ultrasound|x-ray|mri|ppe|ventilator|surgical|diagnostic equipment)\\y'
    },
    {
      slug: 'health-pharmaceuticals',
      pattern: '\\y(health|medical|medicine|pharmaceutical|drugs?|vaccines?|hospital|clinics?|patient|nurses?|doctors?|therapeutic|laboratory|clinical|reagents)\\y'
    },
    {
      slug: 'ict-technology',
      pattern: '\\y(ict|software|hardware|computers?|laptops?|network|internet|websites?|servers?|telecom|telephony|fiber|cctv|databases?|cloud|it equipment|printers?|cybersecurity)\\y'
    },
    {
      slug: 'construction-engineering',
      pattern: '\\y(engineering|structural|architectural|geotechnical|surveying|electrical works|plumbing works|mechanical works)\\y'
    },
    {
      slug: 'construction-infrastructure',
      pattern: '\\y(construction|infrastructure|building|renovation|rehabilitation|roads?|bridges?|paving|civil works|drainage|culverts?|masonry|roofing|borehole drilling)\\y'
    },
    {
      slug: 'water-sanitation',
      pattern: '\\y(water|sanitation|wash|boreholes?|wells?|latrines?|hygiene|sewage|water supply|piping|water tanks?|irrigation)\\y'
    },
    {
      slug: 'agriculture-food',
      pattern: '\\y(agriculture|farming|food|maize|sorghum|beans|seeds|fertilizers?|crops?|livestock|veterinary|grain|milling|flour|rations?)\\y'
    },
    {
      slug: 'transport-logistics',
      pattern: '\\y(transport|logistics|fleet|vehicles?|motor\\s*bikes?|trucks?|cars?|land\\s*cruisers?|freight|shipping|warehousing|clearance|courier|air\\s*travel|flights?|rental vehicle)\\y'
    },
    {
      slug: 'energy-power',
      pattern: '\\y(energy|power|solar|generators?|electricity|electrical|fuels?|diesel|petrol|batteries|inverters?|grid|transformers?|transmission)\\y'
    },
    {
      slug: 'financial-services',
      pattern: '\\y(audit|auditing|financial|accounting|taxes?|insurance|banking|microfinance|payments?|treasury|actuarial)\\y'
    },
    {
      slug: 'education-training',
      pattern: '\\y(education|training|schools?|curriculum|teaching|learning|capacity building|workshops?|scholarships?|pedagogy|vocational)\\y'
    }
  ];

  let reclassified = 0;
  for (const r of rules) {
    const secId = secMap[r.slug];
    if (!secId) continue;
    const res = await sql`
      UPDATE tenders
      SET sector_id = ${secId}, updated_at = NOW()
      WHERE title ~* ${r.pattern} OR description ~* ${r.pattern}
      RETURNING id
    `;
    reclassified += res.length;
    console.log(`  ✓ Reclassified to "${r.slug}": ${res.length} tenders`);
  }

  console.log(`\nTotal reclassified to specific sectors: ${reclassified}`);

  const breakdown = await sql`
    SELECT ts.name, COUNT(*)::int as count 
    FROM tenders t 
    JOIN tender_sectors ts ON t.sector_id = ts.id 
    GROUP BY ts.name 
    ORDER BY count DESC
  `;
  console.log('\nFinal Tender Sector Distribution:');
  for (const b of breakdown) {
    console.log(`  ${b.name.padEnd(35)} ${b.count}`);
  }

  await sql.end();
  console.log('\nSECTOR RECLASSIFICATION COMPLETE! ✅\n');
}

reclassifySectors().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
