import { score, noul, choice } from '@typesafe-ai/sdk';
import { systemOne } from './clef-client.mjs';
const jev = { systemOne };

async function main() {
  const result = await jev.systemOne({
    state: { name: "Red Cross", text: "This guide is very detailed and excellent." },
    questions: {
      sector: choice("Classify the sector", { "NGO": null, "Government": null, "Private": null }),
      quality: score("Rate the quality", ["Awful", "Poor", "Fair", "Good", "Excellent", "Perfect"])
    }
  });
  console.log("Result:", JSON.stringify(result, null, 2));
}
main().catch(console.error);
