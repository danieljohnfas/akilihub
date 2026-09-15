import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');

async function main() {
  console.log('--- JOBS DETAILED AUDIT ---');
  
  const shortDesc = await sql`SELECT count(*) FROM jobs WHERE length(description) < 150`;
  const missingReq = await sql`SELECT count(*) FROM jobs WHERE requirements IS NULL OR requirements = ''`;
  const missingSector = await sql`SELECT count(*) FROM jobs WHERE sector IS NULL OR sector = ''`;
  const missingProfession = await sql`SELECT count(*) FROM jobs WHERE profession IS NULL OR profession = ''`;
  const missingExperience = await sql`SELECT count(*) FROM jobs WHERE experience_level IS NULL OR experience_level = ''`;
  const missingEducation = await sql`SELECT count(*) FROM jobs WHERE education_level IS NULL OR education_level = ''`;
  const missingSkills = await sql`SELECT count(*) FROM jobs WHERE skills IS NULL OR array_length(skills, 1) = 0`;
  
  console.log(`Short descriptions (< 150 chars): ${shortDesc[0].count}`);
  console.log(`Missing requirements: ${missingReq[0].count}`);
  console.log(`Missing sector: ${missingSector[0].count}`);
  console.log(`Missing profession: ${missingProfession[0].count}`);
  console.log(`Missing experience level: ${missingExperience[0].count}`);
  console.log(`Missing education level: ${missingEducation[0].count}`);
  console.log(`Missing skills: ${missingSkills[0].count}`);

  process.exit(0);
}

main().catch(console.error);
