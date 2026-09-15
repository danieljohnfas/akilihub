import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });
import postgres from 'postgres';
import { generateObjectWithFallback } from '../src/lib/ai/router';
import { z } from 'zod';

const sql = postgres(process.env.DATABASE_URL + '?sslmode=require', { max: 20 });

const BATCH_SIZE = 100; // Total jobs per DB query
const CHUNK_SIZE = 20; // Jobs per AI prompt

async function processChunk(jobs: any[]) {
  try {
    const promptText = jobs.map((j, i) => `[JOB ${i}]\nID: ${j.id}\nTitle: ${j.title}\nDescription: ${j.description.substring(0, 1000)}`).join('\n\n---\n\n');
    
    const { object } = await generateObjectWithFallback({
      schema: z.object({
        results: z.array(z.object({
          jobIndex: z.number().describe("The index [JOB i] from the prompt"),
          requirements: z.string().describe("All qualifications, years of experience, specific skills."),
          sector: z.string().describe("The industry sector."),
          profession: z.string().describe("The specific profession/role category."),
          experienceLevel: z.enum(['entry', 'mid', 'senior', 'executive']).describe("Inferred experience level."),
          educationLevel: z.string().describe("Required education."),
          skills: z.array(z.string()).describe("List of technical or soft skills.")
        }))
      }),
      prompt: `Extract structured metadata for the following ${jobs.length} jobs. Match the jobIndex to the [JOB i] marker in the text.\n\n${promptText}`,
      maxTokens: 4000,
    });

    const queries = [];
    for (const res of object.results) {
      const job = jobs[res.jobIndex];
      if (!job) continue;
      
      queries.push(sql`
        UPDATE jobs
        SET 
          requirements = ${res.requirements || ''},
          sector = ${res.sector || ''},
          profession = ${res.profession || ''},
          experience_level = ${res.experienceLevel || ''},
          education_level = ${res.educationLevel || ''},
          skills = ${res.skills || []}
        WHERE id = ${job.id}
      `);
    }
    
    if (queries.length > 0) {
      await Promise.all(queries);
    }
  } catch (e) {
    console.error(`Chunk failed:`, e.message);
  }
}

async function main() {
  console.log('🔄 Starting Bulk Data Standards Fix...');
  let totalFixed = 0;
  
  while (true) {
    const jobs = await sql`
      SELECT id, title, description 
      FROM jobs 
      WHERE sector IS NULL OR profession IS NULL
      LIMIT ${BATCH_SIZE}
    `;
    
    if (jobs.length === 0) {
      console.log('✅ All jobs fixed!');
      break;
    }
    
    console.log(`Processing batch of ${jobs.length} jobs...`);
    
    // Split into chunks of CHUNK_SIZE
    const chunks = [];
    for (let i = 0; i < jobs.length; i += CHUNK_SIZE) {
      chunks.push(jobs.slice(i, i + CHUNK_SIZE));
    }
    
    await Promise.all(chunks.map(chunk => processChunk(chunk)));
    totalFixed += jobs.length;
    console.log(`Progress: ${totalFixed} jobs fixed so far...`);
  }
  
  process.exit(0);
}

main().catch(console.error);
