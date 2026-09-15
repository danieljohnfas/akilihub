import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');

async function main() {
  console.log('Y"" Applying GICS, ISCO-08, and ISCED-11 international standards...');

  const jobsRes = await sql`
    UPDATE jobs 
    SET 
      sector = 
        CASE 
          WHEN title ILIKE '%developer%' OR title ILIKE '%software%' OR title ILIKE '%IT %' THEN 'Information Technology'
          WHEN title ILIKE '%nurse%' OR title ILIKE '%doctor%' OR title ILIKE '%health%' THEN 'Health Care'
          WHEN title ILIKE '%bank%' OR title ILIKE '%finance%' OR title ILIKE '%accountant%' THEN 'Financials'
          WHEN title ILIKE '%sales%' OR title ILIKE '%marketing%' THEN 'Consumer Discretionary'
          WHEN title ILIKE '%engineer%' OR title ILIKE '%mechanic%' OR title ILIKE '%technician%' THEN 'Industrials'
          WHEN title ILIKE '%energy%' OR title ILIKE '%mining%' THEN 'Energy'
          WHEN title ILIKE '%telecom%' OR title ILIKE '%communications%' THEN 'Communication Services'
          ELSE 'Industrials'
        END,
      profession = 
        CASE 
          WHEN title ILIKE '%developer%' OR title ILIKE '%engineer%' OR title ILIKE '%accountant%' OR title ILIKE '%doctor%' THEN 'Professionals'
          WHEN title ILIKE '%manager%' OR title ILIKE '%director%' OR title ILIKE '%head%' THEN 'Managers'
          WHEN title ILIKE '%technician%' OR title ILIKE '%assistant%' THEN 'Technicians and Associate Professionals'
          WHEN title ILIKE '%clerk%' OR title ILIKE '%admin%' OR title ILIKE '%receptionist%' THEN 'Clerical Support Workers'
          WHEN title ILIKE '%sales%' OR title ILIKE '%customer%' OR title ILIKE '%service%' THEN 'Service and Sales Workers'
          WHEN title ILIKE '%driver%' OR title ILIKE '%operator%' THEN 'Plant and Machine Operators and Assemblers'
          WHEN title ILIKE '%cleaner%' OR title ILIKE '%guard%' THEN 'Elementary Occupations'
          ELSE 'Professionals'
        END,
      experience_level = 
        CASE 
          WHEN experience_level IN ('entry', 'mid', 'senior', 'executive') THEN experience_level
          WHEN title ILIKE '%senior%' OR description ILIKE '%senior%' OR requirements ILIKE '%senior%' OR description ILIKE '%5 years%' OR requirements ILIKE '%5 years%' OR requirements ILIKE '%3 years%' THEN 'senior'
          WHEN title ILIKE '%entry%' OR title ILIKE '%junior%' OR description ILIKE '%0-1 year%' OR requirements ILIKE '%0-1 year%' THEN 'entry'
          WHEN title ILIKE '%director%' OR title ILIKE '%head %' THEN 'executive'
          ELSE 'mid'
        END,
      education_level = 
        CASE 
          WHEN description ILIKE '%phd%' OR requirements ILIKE '%phd%' OR description ILIKE '%doctorate%' OR requirements ILIKE '%doctorate%' THEN 'Doctoral or Equivalent Level'
          WHEN description ILIKE '%master%' OR requirements ILIKE '%master%' THEN 'Master''s or Equivalent Level'
          WHEN description ILIKE '%bachelor%' OR requirements ILIKE '%bachelor%' OR description ILIKE '%degree%' OR requirements ILIKE '%degree%' THEN 'Bachelor''s or Equivalent Level'
          WHEN description ILIKE '%diploma%' OR requirements ILIKE '%diploma%' THEN 'Short-cycle Tertiary Education'
          ELSE 'Upper Secondary Education'
        END,
      requirements = COALESCE(requirements, 'Standard professional qualifications, strong communication skills, and relevant industry experience required. Detailed requirements not explicitly stated in source.'),
      skills = COALESCE(skills, ARRAY['Communication', 'Analytical Thinking', 'Teamwork'])
  `;
  
  console.log(`o. Upgraded ${jobsRes.count} Job records to international standards.`);
  process.exit(0);
}

main().catch(console.error);
