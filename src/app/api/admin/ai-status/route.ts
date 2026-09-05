import { NextRequest, NextResponse } from "next/server";
import { keyPool } from "@/lib/ai/key-pool";
import "@/lib/ai/router";
import { SESSION_COOKIE, verifyAdminSession } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !(await verifyAdminSession(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    totalKeys: keyPool.size,
    availableKeys: await keyPool.getAvailableCount(),
    keys: await keyPool.getStatus(),
  });
}
