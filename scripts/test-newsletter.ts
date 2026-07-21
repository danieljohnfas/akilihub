import { config } from 'dotenv';
config({ path: '.env.local' });

import { Resend } from "resend";
import { render } from "@react-email/render";
import { WeeklyNewsletterEmail, DailyDigestEmail } from "../src/lib/email/templates";
import React from "react";

async function testNewsletter() {
  if (!process.env.RESEND_API_KEY) {
    console.error("❌ No RESEND_API_KEY found in .env.local");
    process.exit(1);
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const adminEmail = process.env.ADMIN_EMAIL || "danieljohnfassanga@gmail.com";

  console.log("Generating Weekly Newsletter HTML...");
  
  // Dummy data
  const topTenders = [
    { id: "1", title: "Construction of Road in Kinshasa", subtitle: "Budget: $5M", url: "https://akilibrain.com/tenders/1" },
    { id: "2", title: "Supply of Medical Equipment", subtitle: "Budget: $1.2M", url: "https://akilibrain.com/tenders/2" },
  ];
  const topJobs = [
    { id: "1", title: "Senior Software Engineer", subtitle: "Safaricom - Nairobi", url: "https://akilibrain.com/jobs/1" },
    { id: "2", title: "Public Health Specialist", subtitle: "WHO - Kampala", url: "https://akilibrain.com/jobs/2" },
  ];

  const htmlOutput = await render(
    React.createElement(WeeklyNewsletterEmail, {
      name: "Daniel",
      topTenders,
      topJobs,
    })
  );

  console.log(`Sending test email to ${adminEmail}...`);
  try {
    const data = await resend.emails.send({
      from: "AkiliBrain Newsletter <alerts@akilibrain.com>", 
      // Important: if domain is unverified, Resend requires you to use their test domain or you will get a 403 error!
      // But typically, using "onboarding@resend.dev" as the sender is allowed for unverified domains.
      // Let's try sending with alerts@akilibrain.com. If it fails, we catch it.
      to: [adminEmail],
      subject: "🧪 TEST: The AkiliBrain Weekly Intelligence Recap",
      html: htmlOutput,
    });
    
    console.log("✅ Email sent successfully:", data);
  } catch (error) {
    console.error("❌ Failed to send email:");
    console.error(error);
  }
}

testNewsletter().catch(console.error);
