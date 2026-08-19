const { Resend } = require("resend");

require("dotenv").config({ path: ".env.local" });

const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
  console.log("Testing Resend with API key:", process.env.RESEND_API_KEY?.slice(0, 10) + "...");
  
  try {
    const result = await resend.emails.send({
      from: "AkiliBrain Cleanup <noreply@akilibrain.com>",
      to: "danieljohnfassanga@gmail.com",
      subject: "🧪 Test Email from AkiliBrain",
      html: "<p>This is a test email to verify the email sending pipeline is working.</p>",
    });
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Error sending email:", err);
  }
}

main();
