import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { SESSION_COOKIE, verifyAdminSession } from "@/lib/admin/session";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const secret = url.searchParams.get("secret");
    const expected = process.env.CLEANUP_TRIGGER_SECRET;

    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const adminOk = Boolean(token && (await verifyAdminSession(token)));
    const secretOk = Boolean(expected && secret === expected);

    if (!adminOk && !secretOk) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const batchSize = parseInt(url.searchParams.get("batch") || "20", 10);

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
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
