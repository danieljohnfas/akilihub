import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { SESSION_COOKIE, verifyAdminSession } from "@/lib/admin/session";
import { hasValidSecret } from "@/lib/security/secrets";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const adminOk = Boolean(token && (await verifyAdminSession(token)));
    const secretOk = hasValidSecret(request, process.env.CLEANUP_TRIGGER_SECRET);

    if (!adminOk && !secretOk) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requested = parseInt(url.searchParams.get("batch") || "20", 10);
    const batchSize = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 100) : 20;

    await inngest.send({
      name: "data.verification.v2.start",
      data: {
        batchSize,
        startTime: Date.now(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Data verification and cleanup task dispatched.",
    });
  } catch (error: unknown) {
    console.error("[start-cleanup]", error);
    return NextResponse.json({ error: "Failed to dispatch cleanup" }, { status: 500 });
  }
}
