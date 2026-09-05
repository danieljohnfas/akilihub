import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { countries } from "@/lib/db/schema/shared";
import { SESSION_COOKIE, verifyAdminSession } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !(await verifyAdminSession(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await db.select().from(countries).limit(1);
    return NextResponse.json({ status: "ok", rowCount: data.length });
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    return NextResponse.json(
      { status: "error", message: e.message, code: e.code },
      { status: 500 }
    );
  }
}
