const { Resend } = require("resend");

require("dotenv").config({ path: ".env.local" });

const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
  // List emails sent recently
  const emails = await resend.emails.list();
  const list = emails?.data?.data || [];
  
  console.log(`Found ${list.length} recent emails:`);
  for (const email of list.slice(0, 10)) {
    console.log(`  [${email.last_event}] ${email.subject} -> ${email.to?.join(',')} (${email.created_at})`);
  }
}

main();
