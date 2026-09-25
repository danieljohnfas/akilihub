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

async function fillExpEduLevels() {
  console.log('================================================================');
  console.log('   FILLING experience_level & education_level FROM REQUIREMENTS  ');
  console.log('================================================================\n');

  const [before] = await sql`SELECT COUNT(*)::int as c FROM jobs WHERE is_active = true AND experience_level IS NULL`;
  console.log(`Active jobs missing experience_level before: ${before.c}\n`);

  // EXPERIENCE LEVEL — keyword-based heuristics from requirements text
  // Order matters: check senior/executive first, then junior/entry, then mid

  // 1. Executive / C-level
  const rExec = await sql`
    UPDATE jobs
    SET experience_level = 'executive', updated_at = NOW()
    WHERE is_active = true AND experience_level IS NULL
      AND (requirements || ' ' || COALESCE(title, '')) ~* 
        '\\y(chief|ceo|coo|cfo|cto|vp |vice president|managing director|executive director|board |c-suite|c-level)\\y'
    RETURNING id
  `;
  console.log(`  ✓ Marked executive:    ${rExec.length} jobs`);

  // 2. Senior / Lead (8+ years)
  const rSenior = await sql`
    UPDATE jobs
    SET experience_level = 'senior', updated_at = NOW()
    WHERE is_active = true AND experience_level IS NULL
      AND (requirements || ' ' || COALESCE(title, '')) ~* 
        '\\y(senior|lead |principal |head of|8 years|9 years|10 years|10\\+ years|\\d\\d years|sr\\.)\\y'
    RETURNING id
  `;
  console.log(`  ✓ Marked senior:       ${rSenior.length} jobs`);

  // 3. Mid-level (3–7 years)
  const rMid = await sql`
    UPDATE jobs
    SET experience_level = 'mid_level', updated_at = NOW()
    WHERE is_active = true AND experience_level IS NULL
      AND (requirements || ' ' || COALESCE(title, '')) ~* 
        '\\y(3 years|4 years|5 years|6 years|7 years|3-5 years|3\\+ years|4\\+ years|5\\+ years|mid-level|mid level|manager|supervisor|coordinator|specialist)\\y'
    RETURNING id
  `;
  console.log(`  ✓ Marked mid_level:    ${rMid.length} jobs`);

  // 4. Entry / Junior (0–2 years)
  const rEntry = await sql`
    UPDATE jobs
    SET experience_level = 'entry_level', updated_at = NOW()
    WHERE is_active = true AND experience_level IS NULL
      AND (requirements || ' ' || COALESCE(title, '')) ~* 
        '\\y(entry.level|junior|fresh graduate|graduate trainee|intern|attachment|0-1 year|1-2 year|1 year|2 years|no experience|less than)\\y'
    RETURNING id
  `;
  console.log(`  ✓ Marked entry_level:  ${rEntry.length} jobs`);

  // 5. Default remaining active jobs to mid_level (most common for untagged)
  const rDefault = await sql`
    UPDATE jobs
    SET experience_level = 'mid_level', updated_at = NOW()
    WHERE is_active = true AND experience_level IS NULL
    RETURNING id
  `;
  console.log(`  ✓ Defaulted to mid_level: ${rDefault.length} jobs (catch-all)\n`);

  // EDUCATION LEVEL — keyword-based heuristics

  const [eduBefore] = await sql`SELECT COUNT(*)::int as c FROM jobs WHERE is_active = true AND education_level IS NULL`;
  console.log(`Active jobs missing education_level before: ${eduBefore.c}`);

  // 1. PhD / Doctorate
  const rPhd = await sql`
    UPDATE jobs
    SET education_level = 'phd', updated_at = NOW()
    WHERE is_active = true AND education_level IS NULL
      AND (requirements || ' ' || COALESCE(title, '')) ~* 
        '\\y(phd|doctorate|doctoral|d\\.phil)\\y'
    RETURNING id
  `;
  console.log(`  ✓ Marked phd:              ${rPhd.length} jobs`);

  // 2. Masters
  const rMasters = await sql`
    UPDATE jobs
    SET education_level = 'masters_degree', updated_at = NOW()
    WHERE is_active = true AND education_level IS NULL
      AND (requirements || ' ' || COALESCE(title, '')) ~* 
        "\\y(master'?s?|mba|msc|m\\.sc|m\\.a\\.|m\\.eng|postgraduate diploma|pg diploma)\\y"
    RETURNING id
  `;
  console.log(`  ✓ Marked masters_degree:   ${rMasters.length} jobs`);

  // 3. Bachelor's Degree
  const rBsc = await sql`
    UPDATE jobs
    SET education_level = 'bachelor_degree', updated_at = NOW()
    WHERE is_active = true AND education_level IS NULL
      AND (requirements || ' ' || COALESCE(title, '')) ~* 
        "\\y(bachelor'?s?|degree|b\\.sc|bsc|b\\.a\\.|b\\.eng|university degree|undergraduate)\\y"
    RETURNING id
  `;
  console.log(`  ✓ Marked bachelor_degree:  ${rBsc.length} jobs`);

  // 4. Diploma / Certificate
  const rDip = await sql`
    UPDATE jobs
    SET education_level = 'diploma', updated_at = NOW()
    WHERE is_active = true AND education_level IS NULL
      AND (requirements || ' ' || COALESCE(title, '')) ~* 
        '\\y(diploma|certificate|certification|kcse|secondary school|high school|o-level|a-level|form four)\\y'
    RETURNING id
  `;
  console.log(`  ✓ Marked diploma:          ${rDip.length} jobs`);

  // 5. Default remainder to bachelor_degree
  const rEduDefault = await sql`
    UPDATE jobs
    SET education_level = 'bachelor_degree', updated_at = NOW()
    WHERE is_active = true AND education_level IS NULL
    RETURNING id
  `;
  console.log(`  ✓ Defaulted to bachelor_degree: ${rEduDefault.length} jobs (catch-all)\n`);

  const [expAfter] = await sql`SELECT COUNT(*)::int as c FROM jobs WHERE is_active = true AND experience_level IS NULL`;
  const [eduAfter] = await sql`SELECT COUNT(*)::int as c FROM jobs WHERE is_active = true AND education_level IS NULL`;
  console.log(`Active jobs still missing experience_level: ${expAfter.c}  (must be 0)`);
  console.log(`Active jobs still missing education_level:  ${eduAfter.c}  (must be 0)`);

  // Distribution check
  const expDist = await sql`
    SELECT experience_level, COUNT(*)::int as c 
    FROM jobs WHERE is_active = true 
    GROUP BY experience_level ORDER BY c DESC
  `;
  console.log('\n  experience_level distribution:');
  for (const e of expDist) {
    console.log(`    - ${e.experience_level}: ${e.c} jobs`);
  }

  const eduDist = await sql`
    SELECT education_level, COUNT(*)::int as c 
    FROM jobs WHERE is_active = true 
    GROUP BY education_level ORDER BY c DESC
  `;
  console.log('\n  education_level distribution:');
  for (const e of eduDist) {
    console.log(`    - ${e.education_level}: ${e.c} jobs`);
  }

  await sql.end();
}

fillExpEduLevels().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
