import { Inngest } from "inngest";
import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

const inngest = new Inngest({ id: "akilibrain" });

async function main() {
  console.log("Sending dummy event to Inngest...");
  await inngest.send({
    name: "tenders.new",
    data: {
      tenderId: "TND-TEST",
      title: "Provision of Advanced AI Tooling for East Africa (Test Alert)",
      count: 1,
      source: "Local Testing Script"
    }
  });
  console.log("✅ Event sent successfully!");
}

main().catch(console.error);
