'use server';

import { db } from '@/lib/db';
import { bookmarks } from '@/lib/db/schema/users';
import { and, eq } from 'drizzle-orm';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function toggleBookmark(itemId: string, itemType: 'job' | 'tender' | 'guide', pathToRevalidate?: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to bookmark items.' };
  }

  try {
    const existing = await db.query.bookmarks.findFirst({
      where: and(
        eq(bookmarks.userId, user.id),
        eq(bookmarks.itemId, itemId),
        eq(bookmarks.itemType, itemType)
      )
    });

    if (existing) {
      await db.delete(bookmarks).where(eq(bookmarks.id, existing.id));
    } else {
      await db.insert(bookmarks).values({
        userId: user.id,
        itemId,
        itemType,
      });
    }

    if (pathToRevalidate) {
      revalidatePath(pathToRevalidate);
    }

    return { success: true, bookmarked: !existing };
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    return { error: 'Failed to update bookmark. Please try again.' };
  }
}

export async function checkBookmarkStatus(itemId: string, itemType: 'job' | 'tender' | 'guide') {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {}
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return false;

  const existing = await db.query.bookmarks.findFirst({
    where: and(
      eq(bookmarks.userId, user.id),
      eq(bookmarks.itemId, itemId),
      eq(bookmarks.itemType, itemType)
    )
  });

  return !!existing;
}
