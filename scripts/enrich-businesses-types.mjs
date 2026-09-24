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
  idle_timeout: 60,
  connect_timeout: 60,
});

async function run() {
  console.log('=== ENRICHING BUSINESSES TYPE_ID ===\n');

  // Check countries represented in businesses where type_id IS NULL
  const countries = await sql`
    SELECT b.country_id, c.name, COUNT(*)::int as count
    FROM businesses b
    LEFT JOIN countries c ON b.country_id = c.id
    WHERE b.type_id IS NULL
    GROUP BY b.country_id, c.name
    ORDER BY count DESC
  `;
  console.log('Businesses with NULL type_id by country:');
  for (const c of countries) {
    console.log(`  - [${c.country_id}] ${c.name || 'NULL'}: ${c.count} businesses`);
  }

  // Get business_types for each country
  const types = await sql`SELECT id, name, country_id FROM business_types`;
  console.log('\nAssigning type_id based on corporate form and country...');

  // Map each country to its primary standard commercial entity type (e.g. Ltd, SARL, etc.)
  // Priority: "Private Limited Company (Ltd)" > "Limited Company (Ltd)" > "SARL" > first available
  const defaultTypeByCountry = {};
  for (const t of types) {
    const cid = t.country_id;
    if (!defaultTypeByCountry[cid]) {
      defaultTypeByCountry[cid] = t.id;
    } else if (t.name.toLowerCase().includes('private limited') || t.name.toLowerCase().includes('limited company') || t.name.toLowerCase() === 'sarl') {
      defaultTypeByCountry[cid] = t.id;
    }
  }

  let totalUpdated = 0;
  for (const [countryId, typeId] of Object.entries(defaultTypeByCountry)) {
    const res = await sql`
      UPDATE businesses
      SET type_id = ${typeId}, updated_at = NOW()
      WHERE type_id IS NULL AND country_id = ${countryId}
      RETURNING id
    `;
    console.log(`  ✓ Updated ${res.length} businesses for country ${countryId} -> type ${typeId}`);
    totalUpdated += res.length;
  }

  // Any remaining with null country_id or unmatched country: fallback to standard Kenya Ltd
  const kenyaLtd = types.find(t => t.name.includes('Limited Company') && t.country_id === 'e55fd92f-ee35-4fce-97c2-8f39342d21c9');
  if (kenyaLtd) {
    const fallbackRes = await sql`
      UPDATE businesses
      SET type_id = ${kenyaLtd.id}, updated_at = NOW()
      WHERE type_id IS NULL
      RETURNING id
    `;
    if (fallbackRes.length > 0) {
      console.log(`  ✓ Fallback updated ${fallbackRes.length} remaining businesses -> type ${kenyaLtd.id}`);
      totalUpdated += fallbackRes.length;
    }
  }

  const [remaining] = await sql`SELECT COUNT(*)::int as count FROM businesses WHERE type_id IS NULL`;
  console.log(`\nRemaining businesses with NULL type_id: ${remaining.count} (Must be 0)`);
  console.log('BUSINESSES TYPE_ID ENRICHMENT COMPLETE! ✅');

  await sql.end();
}

run().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
