import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifyAdminSession } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

/**
 * Former inline AI verify/delete endpoint. Disabled as a public GET.
 * Use the Inngest data-cleanup worker via /api/admin/start-cleanup instead.
 */
export async function GET(request: NextRequest) {
  const cron = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const adminOk = Boolean(token && (await verifyAdminSession(token)));
  const cronOk = Boolean(cronSecret && cron === `Bearer ${cronSecret}`);

  if (!adminOk && !cronOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    {
      error: "Gone",
      message: "Inline cron-verify is disabled. Trigger data.verification.v2.start via /api/admin/start-cleanup.",
    },
    { status: 410 }
  );
}
