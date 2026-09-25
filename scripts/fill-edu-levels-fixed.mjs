import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  max: 1,
  prepare: false,
  idle_timeout: 120,
  connect_timeout: 60,
});

async function fillEduLevels() {
  console.log('================================================================');
  console.log('   FILLING education_level FROM REQUIREMENTS (FIXED REGEX)     ');
  console.log('================================================================\n');

  const [before] = await sql`SELECT COUNT(*)::int as c FROM jobs WHERE is_active = true AND education_level IS NULL`;
  console.log(`Active jobs missing education_level before: ${before.c}`);

  // 1. PhD / Doctorate
  const rPhd = await sql`
    UPDATE jobs
    SET education_level = 'phd', updated_at = NOW()
    WHERE is_active = true AND education_level IS NULL
      AND (requirements || ' ' || COALESCE(title, '')) ~* 
        '\y(phd|doctorate|doctoral|d\.phil)\y'
    RETURNING id
  `;
  console.log(`  ✓ Marked phd:              ${rPhd.length} jobs`);

  // 2. Masters (split into shorter patterns to avoid 63-char identifier truncation)
  const rMasters1 = await sql`
    UPDATE jobs
    SET education_level = 'masters_degree', updated_at = NOW()
    WHERE is_active = true AND education_level IS NULL
      AND (requirements || ' ' || COALESCE(title, '')) ~* 
        '\y(masters|mba|msc|m\.sc|postgraduate diploma|pg diploma)\y'
    RETURNING id
  `;
  const rMasters2 = await sql`
    UPDATE jobs
    SET education_level = 'masters_degree', updated_at = NOW()
    WHERE is_active = true AND education_level IS NULL
      AND (requirements || ' ' || COALESCE(title, '')) ~* 
        '\y(m\.a\.|m\.eng|master of|masters degree|post graduate)\y'
    RETURNING id
  `;
  console.log(`  ✓ Marked masters_degree:   ${rMasters1.length + rMasters2.length} jobs`);

  // 3. Bachelor's Degree
  const rBsc1 = await sql`
    UPDATE jobs
    SET education_level = 'bachelor_degree', updated_at = NOW()
    WHERE is_active = true AND education_level IS NULL
      AND (requirements || ' ' || COALESCE(title, '')) ~* 
        '\y(bachelor|degree|b\.sc|bsc|b\.eng|university degree)\y'
    RETURNING id
  `;
  const rBsc2 = await sql`
    UPDATE jobs
    SET education_level = 'bachelor_degree', updated_at = NOW()
    WHERE is_active = true AND education_level IS NULL
      AND (requirements || ' ' || COALESCE(title, '')) ~* 
        '\y(b\.a\.|undergraduate|first degree|honors degree)\y'
    RETURNING id
  `;
  console.log(`  ✓ Marked bachelor_degree:  ${rBsc1.length + rBsc2.length} jobs`);

  // 4. Diploma / Certificate
  const rDip = await sql`
    UPDATE jobs
    SET education_level = 'diploma', updated_at = NOW()
    WHERE is_active = true AND education_level IS NULL
      AND (requirements || ' ' || COALESCE(title, '')) ~* 
        '\y(diploma|certificate|kcse|secondary school|high school|o.level|a.level|form four|form six)\y'
    RETURNING id
  `;
  console.log(`  ✓ Marked diploma:          ${rDip.length} jobs`);

  // 5. Default remainder to bachelor_degree (most common for African job market)
  const rEduDefault = await sql`
    UPDATE jobs
    SET education_level = 'bachelor_degree', updated_at = NOW()
    WHERE is_active = true AND education_level IS NULL
    RETURNING id
  `;
  console.log(`  ✓ Defaulted to bachelor_degree: ${rEduDefault.length} jobs (catch-all)\n`);

  const [after] = await sql`SELECT COUNT(*)::int as c FROM jobs WHERE is_active = true AND education_level IS NULL`;
  console.log(`Active jobs still missing education_level: ${after.c}  (must be 0)\n`);

  const eduDist = await sql`
    SELECT education_level, COUNT(*)::int as c 
    FROM jobs WHERE is_active = true 
    GROUP BY education_level ORDER BY c DESC
  `;
  console.log('education_level distribution (active jobs):');
  for (const e of eduDist) {
    console.log(`  - ${e.education_level}: ${e.c} jobs`);
  }

  const expDist = await sql`
    SELECT experience_level, COUNT(*)::int as c 
    FROM jobs WHERE is_active = true 
    GROUP BY experience_level ORDER BY c DESC
  `;
  console.log('\nexperience_level distribution (active jobs):');
  for (const e of expDist) {
    console.log(`  - ${e.experience_level}: ${e.c} jobs`);
  }

  await sql.end();
}

fillEduLevels().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
