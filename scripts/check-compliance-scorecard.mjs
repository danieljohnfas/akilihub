import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false });

async function check() {
  const [total] = await sql`SELECT COUNT(*)::int as count FROM compliance_requirements`;
  const [unverified] = await sql`SELECT COUNT(*)::int as count FROM compliance_requirements WHERE last_verified_at IS NULL`;
  const [withDocs] = await sql`SELECT COUNT(*)::int as count FROM compliance_requirements WHERE required_documents IS NOT NULL AND array_length(required_documents, 1) > 0`;
  const [withRenewal] = await sql`SELECT COUNT(*)::int as count FROM compliance_requirements WHERE renewal_period_days IS NOT NULL`;
  const [withCost] = await sql`SELECT COUNT(*)::int as count FROM compliance_requirements WHERE estimated_cost IS NOT NULL`;
  const [noisyTitles] = await sql`SELECT COUNT(*)::int as count FROM compliance_requirements WHERE title LIKE '[LINK]%' OR title LIKE 'http%'`;

  console.log('=== COMPLIANCE SCORECARD ===');
  console.log('Total compliance requirements:', total.count);
  console.log('Unverified compliance:       ', unverified.count);
  console.log('With required documents:     ', withDocs.count);
  console.log('With renewal period:         ', withRenewal.count);
  console.log('With estimated cost:         ', withCost.count);
  console.log('Noisy titles remaining:      ', noisyTitles.count);
  await sql.end();
}

check();
