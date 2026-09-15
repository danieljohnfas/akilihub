import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');

async function main() {
  console.log('Y"" Applying advanced heuristic updates to enforce data standards...');

  // 1. Enforce standards on JOBS and re-evaluate fallbacks
  const jobsRes = await sql`
    UPDATE jobs 
    SET 
      sector = 
        CASE 
          WHEN sector IS NOT NULL AND sector != 'General Corporate' THEN sector
          WHEN title ILIKE '%developer%' OR title ILIKE '%software%' OR title ILIKE '%IT %' THEN 'Technology'
          WHEN title ILIKE '%nurse%' OR title ILIKE '%doctor%' OR title ILIKE '%health%' THEN 'Healthcare'
          WHEN title ILIKE '%manager%' OR title ILIKE '%director%' THEN 'Management'
          WHEN title ILIKE '%sales%' OR title ILIKE '%marketing%' THEN 'Sales & Marketing'
          WHEN title ILIKE '%teacher%' OR title ILIKE '%education%' THEN 'Education'
          WHEN title ILIKE '%finance%' OR title ILIKE '%accountant%' THEN 'Finance'
          WHEN title ILIKE '%compliance%' THEN 'Legal & Compliance'
          ELSE 'General Corporate'
        END,
      profession = 
        CASE 
          WHEN profession IS NOT NULL AND profession != 'Specialist' THEN profession
          WHEN title ILIKE '%developer%' THEN 'Software Developer'
          WHEN title ILIKE '%sales%' THEN 'Sales Professional'
          WHEN title ILIKE '%accountant%' THEN 'Accountant'
          WHEN title ILIKE '%compliance%' THEN 'Compliance Officer'
          ELSE 'Specialist'
        END,
      experience_level = 
        CASE 
          WHEN experience_level IS NOT NULL AND experience_level != 'mid' THEN experience_level
          WHEN title ILIKE '%senior%' OR description ILIKE '%senior%' OR requirements ILIKE '%senior%' OR description ILIKE '%5 years%' OR requirements ILIKE '%5 years%' OR requirements ILIKE '%3 years%' THEN 'senior'
          WHEN title ILIKE '%entry%' OR title ILIKE '%junior%' OR description ILIKE '%0-1 year%' OR requirements ILIKE '%0-1 year%' THEN 'entry'
          WHEN title ILIKE '%director%' OR title ILIKE '%head %' THEN 'executive'
          ELSE 'mid'
        END,
      education_level = 
        CASE 
          WHEN education_level IS NOT NULL AND education_level != 'High School or Equivalent' THEN education_level
          WHEN description ILIKE '%master%' OR requirements ILIKE '%master%' THEN 'Master''s Degree'
          WHEN description ILIKE '%bachelor%' OR requirements ILIKE '%bachelor%' OR description ILIKE '%degree%' OR requirements ILIKE '%degree%' THEN 'Bachelor''s Degree'
          WHEN description ILIKE '%diploma%' OR requirements ILIKE '%diploma%' THEN 'Diploma'
          ELSE 'High School or Equivalent'
        END,
      requirements = COALESCE(requirements, 'Standard professional qualifications, strong communication skills, and relevant industry experience required. Detailed requirements not explicitly stated in source.'),
      skills = COALESCE(skills, ARRAY['Communication', 'Analytical Thinking', 'Teamwork'])
  `;
  
  console.log(`o. Re-evaluated and fixed ${jobsRes.count} Job records.`);
  process.exit(0);
}

main().catch(console.error);
