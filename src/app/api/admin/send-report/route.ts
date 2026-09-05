import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";
import { Resend } from "resend";
import { SESSION_COOKIE, verifyAdminSession } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

async function authorized(request: NextRequest): Promise<boolean> {
  const cron = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && cron === `Bearer ${cronSecret}`) return true;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return Boolean(token && (await verifyAdminSession(token)));
}

export async function GET(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }
    const resend = new Resend(resendKey);
    const reportTo = process.env.ADMIN_REPORT_EMAIL;
    if (!reportTo) {
      return NextResponse.json({ error: "ADMIN_REPORT_EMAIL not configured" }, { status: 500 });
    }

    const result = await db.execute(sql`SELECT COUNT(*) as count FROM data_verification_log`);
    const verified = result[0]?.count || 0;
    const result2 = await db.execute(sql`SELECT COUNT(*) as count FROM jobs`);
    const jobsCount = result2[0]?.count || 0;
    const result3 = await db.execute(sql`SELECT COUNT(*) as count FROM tenders`);
    const tendersCount = result3[0]?.count || 0;
    const result4 = await db.execute(sql`SELECT COUNT(*) as count FROM compliance_requirements`);
    const complianceCount = result4[0]?.count || 0;

    const emailResult = await resend.emails.send({
      from: "AkiliBrain Cleanup <noreply@akilibrain.com>",
      to: reportTo,
      subject: "AkiliBrain Data Cleanup Status Report",
      html: `<h2>AkiliBrain Data Verification Status</h2>
        <ul>
          <li><b>Records verified:</b> ${String(verified)}</li>
          <li><b>Jobs:</b> ${String(jobsCount)}</li>
          <li><b>Tenders:</b> ${String(tendersCount)}</li>
          <li><b>Compliance:</b> ${String(complianceCount)}</li>
        </ul>`,
    });

    return NextResponse.json({ success: true, emailId: emailResult?.data?.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
