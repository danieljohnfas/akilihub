import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/users"; // we need a subscribers table or just users

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured.");
      return NextResponse.json({ error: "Email service is not configured." }, { status: 503 });
    }

    // Send a welcome email
    const { data, error } = await resend.emails.send({
      from: "AkiliBrain <alerts@akilibrain.com>", // Replace with verified domain when going to prod
      to: [email],
      subject: "Welcome to AkiliBrain Alerts",
      html: `
        <div>
          <h2>Welcome to AkiliBrain</h2>
          <p>You have successfully subscribed to actionable alerts. You'll receive notifications when new high-value tenders, compliance updates, or salary benchmarks are added for your region.</p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend API error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Usually we would insert this email into a subscribers DB table here.
    
    return NextResponse.json({ success: true, message: "Subscribed successfully" });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
