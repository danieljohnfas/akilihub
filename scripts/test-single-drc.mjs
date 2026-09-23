import postgres from 'postgres';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = vals.join('=').trim();
      }
    }
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
const sql = postgres(DATABASE_URL + '?sslmode=require', { max: 5 });

async function testInsert() {
  const [drc] = await sql`SELECT id, name FROM countries WHERE code = 'CD' LIMIT 1`;
  const testUrl = 'https://www.mediacongo.net/emploi-societe-44698_apdi_asbl_administrateur_gestionnaire.html';
  
  try {
    const [inserted] = await sql`
      INSERT INTO jobs (
        title,
        company_name,
        country_id,
        location,
        job_type,
        description,
        source_url,
        employer_url,
        is_active,
        posted_date
      ) VALUES (
        'Administrateur Gestionnaire',
        'APDI Asbl',
        ${drc.id},
        'Sankuru, DRC',
        'full_time',
        'AVIS DE RECRUTEMENT ADMINISTRATEUR GESTIONNAIRE - Hôpital communautaire - Province du Sankuru, RDC. Qualifications requises: Diplôme universitaire en gestion ou économie, minimum 3 ans d expérience.',
        ${testUrl},
        ${testUrl},
        true,
        NOW()
      )
      ON CONFLICT (source_url) DO UPDATE SET is_active = true
      RETURNING id
    `;
    console.log('SUCCESS! Inserted job ID:', inserted.id);
  } catch (e) {
    console.error('ERROR during insert:', e);
  }

  await sql.end();
}

testInsert();
