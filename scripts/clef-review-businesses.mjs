import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { choice } = require('@typesafe-ai/sdk');
const { systemOne } = require('./clef-client.mjs');
const jev = { systemOne };

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
let dbUrl = '';
for (const line of envContent.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.split('=').slice(1).join('=').trim();
  }
}

const sql = postgres(dbUrl + (dbUrl.includes('?') ? '&sslmode=require' : '?sslmode=require'), { max: 10 });

const BATCH_SIZE = 10;
const STANDARD_STATUSES = ['active', 'inactive', 'dissolved', 'suspended', 'unknown'];

function normalizeStatusSimple(status) {
  const s = (status || '').toLowerCase().trim();
  if (['active', 'registered', 'operational'].includes(s)) return 'active';
  if (['inactive', 'dormant', 'closed'].includes(s)) return 'inactive';
  if (['dissolved', 'struck off', 'liquidated'].includes(s)) return 'dissolved';
  if (['suspended', 'frozen'].includes(s)) return 'suspended';
  if (['unknown', ''].includes(s)) return 'unknown';
  return null;
}

async function run() {
  console.log('Fetching business types...');
  const types = await sql`SELECT id, name FROM business_types`;
  const typeChoices = types.map(t => t.name);
  const typeMap = new Map(types.map(t => [t.name, t.id]));

  let updatedTypes = 0;
  let updatedStatuses = 0;

  console.log('Processing businesses with missing type_id or non-standard status...');
  let offset = 0;
  while (true) {
    const businesses = await sql`
      SELECT id, name, status, type_id 
      FROM businesses 
      WHERE type_id IS NULL 
         OR LOWER(status) NOT IN ${sql(STANDARD_STATUSES)}
      ORDER BY id
      LIMIT ${BATCH_SIZE} OFFSET ${offset}
    `;
    
    if (businesses.length === 0) break;

    let failedInBatch = 0;

    const promises = businesses.map(async (b) => {
      let typeIsGood = b.type_id !== null;
      let statusIsGood = STANDARD_STATUSES.includes((b.status || '').toLowerCase().trim());
      
      // 1. Classify type_id if null
      if (!typeIsGood) {
        try {
          const result = await choice(
            jev,
            `Classify this business name into one of the provided types. Name: "${b.name}"`,
            typeChoices
          );
          if (result && typeMap.has(result)) {
            const typeId = typeMap.get(result);
            await sql`UPDATE businesses SET type_id = ${typeId} WHERE id = ${b.id}`;
            updatedTypes++;
            typeIsGood = true;
          }
        } catch (err) {
          console.error(`Error classifying type for business ${b.id}:`, err.message);
        }
      }

      // 2. Normalize status if non-standard
      if (!statusIsGood) {
        try {
          let newStatus = normalizeStatusSimple(b.status);
          if (!newStatus) {
            const result = await choice(
              jev,
              `Map the following business status to one of the standard choices. Status: "${b.status}"`,
              STANDARD_STATUSES
            );
            if (result && STANDARD_STATUSES.includes(result.toLowerCase().trim())) {
              newStatus = result.toLowerCase().trim();
            }
          }
          
          if (newStatus) {
            await sql`UPDATE businesses SET status = ${newStatus} WHERE id = ${b.id}`;
            updatedStatuses++;
            statusIsGood = true;
          }
        } catch (err) {
          console.error(`Error classifying status for business ${b.id}:`, err.message);
        }
      }
      
      // If a row failed to update, it will still match the WHERE clause.
      // So we must increment OFFSET to prevent an infinite loop on this row.
      if (!typeIsGood || !statusIsGood) {
        failedInBatch++;
      }
    });

    await Promise.all(promises);
    offset += failedInBatch;
    console.log(`Processed batch. Next offset: ${offset}, total updated types: ${updatedTypes}, updated statuses: ${updatedStatuses}`);
  }

  console.log(`\n--- Final Stats ---`);
  console.log(`Total Type ID updates: ${updatedTypes}`);
  console.log(`Total Status updates: ${updatedStatuses}`);

  await sql.end();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
