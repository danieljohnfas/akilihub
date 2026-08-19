import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { sql } from 'drizzle-orm';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');

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
      to: "danieljohnfassanga@gmail.com",
      subject: "⏳ Data Cleanup Hourly Status Report",
      html: `
        <h2>AkiliBrain Data Verification Status</h2>
        <p>Here is the current state of the online data cleanup task:</p>
        <ul>
          <li><b>Records verified so far:</b> ${String(verified)}</li>
          <li><b>Current Jobs count:</b> ${String(jobsCount)}</li>
          <li><b>Current Tenders count:</b> ${String(tendersCount)}</li>
          <li><b>Current Compliance count:</b> ${String(complianceCount)}</li>
        </ul>
        <p>Total remaining to verify: ${Number(jobsCount) + Number(tendersCount) + Number(complianceCount) - Number(verified)}</p>
        <p>The GitHub Action cron is running in the background and will continue to process records.</p>
      `,
    });

    return NextResponse.json({ success: true, emailId: emailResult?.data?.id });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
