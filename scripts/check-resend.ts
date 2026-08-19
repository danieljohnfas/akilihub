const { Resend } = require("resend");

require("dotenv").config({ path: ".env.local" });

const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
  // List domains to see verified sending domains
  const domains = await resend.domains.list();
  console.log("Domains:", JSON.stringify(domains?.data?.data || domains, null, 2));

  // Check API key info
  const apiKeys = await resend.apiKeys.list();
  console.log("API Keys:", JSON.stringify(apiKeys?.data?.data || apiKeys, null, 2));
}

main();
