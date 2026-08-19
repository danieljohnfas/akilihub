const { Resend } = require("resend");
const postgres = require("postgres");
const { drizzle } = require("drizzle-orm/postgres-js");
const { sql } = require("drizzle-orm");

require("dotenv").config({ path: ".env.local" });

const resend = new Resend(process.env.RESEND_API_KEY);
const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

async function main() {
  // Count verification log entries
  const result = await db.execute(sql`SELECT COUNT(*) as count FROM data_verification_log`);
  const verified = result[0]?.count || 0;

  const result2 = await db.execute(sql`SELECT COUNT(*) as count FROM jobs`);
  const jobs = result2[0]?.count || 0;

  const result3 = await db.execute(sql`SELECT COUNT(*) as count FROM tenders`);
  const tenders = result3[0]?.count || 0;

  const result4 = await db.execute(sql`SELECT COUNT(*) as count FROM compliance_requirements`);
  const compliance = result4[0]?.count || 0;

  console.log({ verified, jobs, tenders, compliance });

  // Send a manual progress email
  const emailResult = await resend.emails.send({
    from: "AkiliBrain Cleanup <noreply@akilibrain.com>",
    to: "danieljohnfassanga@gmail.com",
    subject: "⏳ Data Cleanup Manual Status Report",
    html: `
      <h2>AkiliBrain Data Verification Status</h2>
      <p>Here is the current state of the online data cleanup task:</p>
      <ul>
        <li><b>Records verified so far:</b> ${verified}</li>
        <li><b>Current Jobs count:</b> ${jobs}</li>
        <li><b>Current Tenders count:</b> ${tenders}</li>
        <li><b>Current Compliance count:</b> ${compliance}</li>
      </ul>
      <p>Total remaining to verify: ${Number(jobs) + Number(tenders) + Number(compliance) - Number(verified)}</p>
      <p>The Inngest worker is running in the background and will continue to process records.</p>
    `,
  });
  console.log("Email sent:", emailResult?.data?.id);
  process.exit(0);
}

main().catch(console.error);
