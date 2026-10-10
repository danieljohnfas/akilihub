import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { choice } = require('@typesafe-ai/sdk');
const { systemOne } = require('./clef-client.mjs');
const jev = { systemOne };

async function main() {
  const result = await jev.systemOne({
    state: "The user is a Nurse.",
    questions: {
      category: choice("Map to a category", { "Software": "Software category", "Healthcare": "Healthcare category" })
    }
  });
  console.log(JSON.stringify(result, null, 2));
}
main().catch(console.error);
