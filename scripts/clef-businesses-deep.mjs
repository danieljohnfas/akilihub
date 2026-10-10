import postgres from 'postgres';
import fs from 'fs';

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!connectionString) {
  console.error("No DATABASE_URL or DIRECT_URL found in environment");
  process.exit(1);
}

const sql = postgres(connectionString, {
  ssl: 'require',
  max: 10,
});

function normalizeName(name) {
  if (!name) return name;
  let cleaned = name.trim();

  // Boilerplate removal
  const boilerplate = [
    /\b\(?pty\)?\s*ltd\.?\b/gi,
    /\bproprietary\s+limited\b/gi,
    /\b\(?pty\)?\s*limited\b/gi,
    /\bpty\.?\b/gi,
    /\bltd\.?\b/gi,
    /\blimited\b/gi,
    /\bcc\.?\b/gi,
    /\bclose\s+corporation\b/gi,
    /\binc\.?\b/gi,
    /\bincorporated\b/gi
  ];

  for (const regex of boilerplate) {
    cleaned = cleaned.replace(regex, '');
  }

  // Remove surrounding brackets
  cleaned = cleaned.replace(/^\s*\(\s*(.*?)\s*\)\s*$/, '$1');
  
  // Remove trailing punctuation
  cleaned = cleaned.replace(/[\,\.\-\_]+$/g, '').trim();

  // Simple capitalization fix for SHOUTY or lowercase names
  const upperCount = (cleaned.match(/[A-Z]/g) || []).length;
  const lowerCount = (cleaned.match(/[a-z]/g) || []).length;
  const totalLetters = upperCount + lowerCount;

  if (totalLetters > 0) {
    // If it's more than 80% uppercase or 80% lowercase, convert to Title Case
    if (upperCount / totalLetters > 0.8 || lowerCount / totalLetters > 0.8) {
      cleaned = cleaned.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
    }
  }

  // Clean up trailing punctuation one more time just in case
  cleaned = cleaned.replace(/[\,\.\-\_]+$/g, '').trim();
  // Normalize multiple spaces
  cleaned = cleaned.replace(/\s{2,}/g, ' ');

  return cleaned;
}

async function run() {
  console.log("Starting business name normalization...");
  const allBusinesses = await sql`SELECT id, name FROM businesses WHERE name IS NOT NULL AND name != ''`;
  console.log(`Found ${allBusinesses.length} total businesses.`);

  let updates = [];

  for (const row of allBusinesses) {
    const originalName = row.name;
    const cleanedName = normalizeName(originalName);

    if (cleanedName && cleanedName !== originalName && cleanedName.length > 0) {
      updates.push({
        id: row.id,
        name: cleanedName
      });
    }
  }

  console.log(`Found ${updates.length} businesses needing updates.`);

  const BATCH_SIZE = 500;
  let updatedCount = 0;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    
    const values = batch.map(b => `('${b.id}', '${b.name.replace(/'/g, "''")}')`).join(', ');
    
    const query = `
      UPDATE businesses AS b
      SET name = v.name
      FROM (VALUES ${values}) AS v(id, name)
      WHERE b.id = v.id::uuid
    `;
    
    await sql.unsafe(query);
    updatedCount += batch.length;
    console.log(`Updated batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(updates.length / BATCH_SIZE)}, total updated so far: ${updatedCount}`);
  }

  console.log("Finished. Total records updated:", updatedCount);
  await sql.end();
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
