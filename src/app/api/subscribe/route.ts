import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/users";
import { eq } from "drizzle-orm";
import { enforceRateLimit } from '@/lib/security/rate-limit';

const resend = new Resend(process.env.RESEND_API_KEY || "re_123");

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, { prefix: 'subscribe', max: 5, window: '10 m' });
  if (limited) return limited;

  try {
    const { email, fullName } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured.");
      return NextResponse.json({ error: "Email service is not configured." }, { status: 503 });
    }

    // 1. Upsert subscriber in DB — check if email already registered
    let savedToDb = false;
    try {
      const existing = await db
        .select({ id: users.id, emailUpdates: users.emailUpdates })
        .from(users)
        .where(eq(users.email, email.toLowerCase().trim()))
        .limit(1);

      if (existing.length > 0) {
        // Re-enable email updates if they had unsubscribed
        if (!existing[0].emailUpdates) {
          await db
            .update(users)
            .set({ emailUpdates: true, updatedAt: new Date() })
            .where(eq(users.id, existing[0].id));
        }
        savedToDb = true;
      } else {
        // Insert as a new newsletter-only subscriber (no Supabase Auth UUID needed
        // because we generate our own UUID here — Supabase Auth users get merged
        // when they sign in via the same email)
        const { randomUUID } = await import("crypto");
        await db
          .insert(users)
          .values({
            id: randomUUID(),
            email: email.toLowerCase().trim(),
            fullName: fullName ?? null,
            emailUpdates: true,
          })
          .onConflictDoNothing();
        savedToDb = true;
      }
    } catch (dbErr) {
      console.error("[Subscribe] DB save failed (non-fatal):", dbErr);
      // Don't block the subscription — still send the welcome email
    }

    // 2. Add to Resend Audience (for bulk campaigns)
    if (process.env.RESEND_AUDIENCE_ID) {
      try {
        await resend.contacts.create({
          email: email.toLowerCase().trim(),
          firstName: fullName?.split(" ")[0] ?? undefined,
          audienceId: process.env.RESEND_AUDIENCE_ID,
          unsubscribed: false,
        });
      } catch (audienceErr) {
        console.warn("[Subscribe] Resend audience add failed (non-fatal):", audienceErr);
      }
    }

    // 3. Send welcome email
    const { error: emailError } = await resend.emails.send({
      from: "AkiliBrain <alerts@akilibrain.com>",
      to: [email],
      subject: "Welcome to AkiliBrain — Your Intelligence Feed is Ready",
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
          <h2 style="margin-top: 0; color: #0f172a;">Welcome to AkiliBrain 🧠</h2>
          <p>You're now subscribed to the most comprehensive intelligence feed for East & Central Africa.</p>
          <p>You'll receive:</p>
          <ul>
            <li><strong>Daily digests</strong> — new tenders, jobs, and compliance updates</li>
            <li><strong>Weekly newsletter</strong> — top opportunities across 9 countries</li>
            <li><strong>Real-time alerts</strong> — when high-value tenders match your profile</li>
          </ul>
          <p style="margin-top: 24px;">
            <a href="https://akilibrain.com" style="background: #0f172a; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Browse Latest Opportunities →</a>
          </p>
          <p style="margin-top: 32px; font-size: 12px; color: #64748b;">
            You can unsubscribe at any time by visiting <a href="https://akilibrain.com/unsubscribe?email=${encodeURIComponent(email)}" style="color: #64748b;">akilibrain.com/unsubscribe</a>.
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error("Resend API error:", emailError);
      return NextResponse.json({ error: emailError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Subscribed successfully",
      savedToDb,
    });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
