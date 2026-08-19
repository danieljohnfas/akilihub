const { Resend } = require("resend");

require("dotenv").config({ path: ".env.local" });

const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
  // Check the status of the test email we just sent
  const emailId = "9b3c44ed-63d7-4183-a566-e498fe3bedd7";
  
  try {
    const email = await resend.emails.get(emailId);
    console.log("Email status:", JSON.stringify(email?.data || email, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
