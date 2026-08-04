"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/users";
import { eq } from "drizzle-orm";

export async function trackUserActivity() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, reason: "unauthenticated" };

  try {
    await db.update(users)
      .set({ lastSeenAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));
    return { success: true };
  } catch (err) {
    console.error("[Tracking] Failed to track activity:", err);
    return { success: false, error: err };
  }
}

export async function trackLastSearch(query: string, module: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, reason: "unauthenticated" };

  // Just track the most recent search string across the platform.
  // Could be enhanced to track per-module in the future.
  const searchQuery = module ? `[${module}] ${query}` : query;

  try {
    await db.update(users)
      .set({ 
        lastSearchQuery: searchQuery,
        lastSeenAt: new Date(), 
        updatedAt: new Date() 
      })
      .where(eq(users.id, user.id));
    return { success: true };
  } catch (err) {
    console.error("[Tracking] Failed to track search:", err);
    return { success: false, error: err };
  }
}
