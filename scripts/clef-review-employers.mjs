import { score, noul, choice } from '@typesafe-ai/sdk';
import { systemOne } from './clef-client.mjs';
import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const jev = { systemOne };
const sql = postgres(process.env.DATABASE_URL);

async function run() {
  console.log('Fetching employers...');
  const employers = await sql`SELECT id, name FROM employers WHERE sector IS NULL OR is_verified = false`;
  
  let updated = 0;
  for (const emp of employers) {
    console.log(`Processing employer: ${emp.name}`);
    const result = await jev.systemOne({
      state: { name: emp.name },
      questions: {
        sector: choice("Classify the sector for this employer based on its name", {
          "NGO": null,
          "Government": null,
          "Private": null,
          "Education": null,
          "Healthcare": null,
          "Finance": null,
          "Technology": null,
          "Other": null
        }),
        isReal: noul("Does this name look like a real organization/company? Name: ${name}")
      }
    });

    const predictedSector = result.answers.sector.choice;
    const isVerifiedProbability = result.answers.isReal.noul;
    const isVerified = isVerifiedProbability > 0.5;

    await sql`UPDATE employers SET sector = ${predictedSector}, is_verified = ${isVerified} WHERE id = ${emp.id}`;
    updated++;
    console.log(`Updated ${emp.name}: sector=${predictedSector}, is_verified=${isVerified} (prob: ${isVerifiedProbability.toFixed(3)})`);
  }
  
  console.log(`Finished updating ${updated} employers.`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
