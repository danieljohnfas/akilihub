"use server";

import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema/jobs";
import { tenders } from "@/lib/db/schema/tenders";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function resolveManualLink(id: string, type: 'job' | 'tender', newUrl: string) {
  if (!newUrl || !newUrl.startsWith('http')) {
    throw new Error('Invalid URL provided.');
  }

  try {
    if (type === 'job') {
      await db.update(jobs)
        .set({ employerUrl: newUrl })
        .where(eq(jobs.id, id));
    } else if (type === 'tender') {
      await db.update(tenders)
        .set({ employerUrl: newUrl })
        .where(eq(tenders.id, id));
    } else {
      throw new Error('Invalid type');
    }

    revalidatePath("/admin/resolve");
    if (type === 'job') revalidatePath(`/jobs/${id}`);
    if (type === 'tender') revalidatePath(`/tenders/${id}`);

    return { success: true };
  } catch (error) {
    console.error("[Manual Resolution] Error:", error);
    return { success: false, error: "Failed to update URL in the database." };
  }
}
