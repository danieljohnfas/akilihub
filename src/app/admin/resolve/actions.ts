"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema/jobs";
import { tenders } from "@/lib/db/schema/tenders";
import { assertAdminAction } from "@/lib/admin/require-admin";
import { isSafeHttpUrl } from "@/lib/security/safe-url";

const inputSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["job", "tender"]),
  newUrl: z.string().max(2048),
});

export async function resolveManualLink(id: string, type: "job" | "tender", newUrl: string) {
  // Server Actions are public endpoints (callable by action id from any route),
  // so authorization must happen here, not only in middleware.
  await assertAdminAction();

  const parsed = inputSchema.safeParse({ id, type, newUrl });
  if (!parsed.success || !isSafeHttpUrl(parsed.data.newUrl)) {
    throw new Error("Invalid input: expected a job/tender id and an http(s) URL.");
  }
  const { id: safeId, type: safeType, newUrl: safeUrl } = parsed.data;

  try {
    if (safeType === "job") {
      await db.update(jobs).set({ employerUrl: safeUrl }).where(eq(jobs.id, safeId));
    } else {
      await db.update(tenders).set({ employerUrl: safeUrl }).where(eq(tenders.id, safeId));
    }

    revalidatePath("/admin/resolve");
    revalidatePath(safeType === "job" ? `/jobs/${safeId}` : `/tenders/${safeId}`);

    return { success: true };
  } catch (error) {
    console.error("[Manual Resolution] Error:", error);
    return { success: false, error: "Failed to update URL in the database." };
  }
}
