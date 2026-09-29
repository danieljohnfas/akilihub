'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { db } from '@/lib/db/client';
import { users, userAlerts } from '@/lib/db/schema/users';
import { createClient } from '@/lib/supabase/server';
import { eq, and } from 'drizzle-orm';

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const fullName = formData.get('fullName') as string;
  const countryId = formData.get('countryId') as string | null;

  try {
    await db.update(users)
      .set({
        fullName: fullName || null,
        countryId: countryId || null,
      })
      .where(eq(users.id, user.id));

    revalidatePath('/account');
  } catch (error: any) {
    console.error('Error updating profile:', error);
  }
}

export async function createAlert(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const moduleName = formData.get('module') as string;
  const keywordsStr = formData.get('keywords') as string;
  const frequency = formData.get('frequency') as 'immediate' | 'daily' | 'weekly';
  const countryId = formData.get('countryId') as string | null;

  const keywords = keywordsStr.split(',').map(k => k.trim()).filter(k => k.length > 0);

  if (!moduleName || keywords.length === 0) {
    return;
  }

  try {
    await db.insert(userAlerts).values({
      userId: user.id,
      module: moduleName,
      keywords,
      frequency,
      countryId: countryId || null,
    });

    revalidatePath('/account');
  } catch (error: any) {
    console.error('Error creating alert:', error);
  }
}

export async function deleteAlert(alertId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  try {
    await db.delete(userAlerts)
      .where(and(eq(userAlerts.id, alertId), eq(userAlerts.userId, user.id)));

    revalidatePath('/account');
  } catch (error: any) {
    console.error('Error deleting alert:', error);
  }
}

export async function toggleAlert(alertId: string, isActive: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  try {
    await db.update(userAlerts)
      .set({ isActive })
      .where(and(eq(userAlerts.id, alertId), eq(userAlerts.userId, user.id)));

    revalidatePath('/account');
  } catch (error: any) {
    console.error('Error toggling alert:', error);
  }
}

export async function toggleEmailUpdates(enabled: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  try {
    await db.update(users)
      .set({ emailUpdates: enabled })
      .where(eq(users.id, user.id));

    revalidatePath('/account');
  } catch (error: any) {
    console.error('Error toggling email updates:', error);
  }
}


/**
 * Permanently deletes the signed-in user's account and personal data (privacy-policy "right to erasure").
 *
 * App data goes first — users → alerts, bookmarks, applications (CV text, cover letters) and mock
 * interviews all cascade — then the Supabase auth identity. If the auth deletion fails the user can simply
 * retry: the app-data step is idempotent. Requires SUPABASE_SERVICE_ROLE_KEY (server-only).
 */
export async function deleteAccount(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const typed = String(formData.get('confirmEmail') ?? '').trim().toLowerCase();
  if (!user.email || typed !== user.email.toLowerCase()) {
    redirect('/account?error=confirm-email');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('[deleteAccount] SUPABASE_SERVICE_ROLE_KEY is not configured.');
    redirect('/account?error=delete-unavailable');
  }

  try {
    await db.delete(users).where(eq(users.id, user.id));

    const admin = createSupabaseAdminClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
  } catch (error) {
    console.error('[deleteAccount] failed:', error);
    redirect('/account?error=delete-failed');
  }

  await supabase.auth.signOut();
  redirect('/?account=deleted');
}
