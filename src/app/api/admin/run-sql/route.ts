import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifyAdminSession } from "@/lib/admin/session";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !(await verifyAdminSession(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // One-off migration endpoint retired — use drizzle migrations instead.
  return NextResponse.json(
    { error: "Gone", message: "Use drizzle migrations; this ad-hoc SQL endpoint is disabled." },
    { status: 410 }
  );
}
