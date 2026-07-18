'use server';

import { revalidatePath } from 'next/cache';
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

  const module = formData.get('module') as string;
  const keywordsStr = formData.get('keywords') as string;
  const frequency = formData.get('frequency') as 'immediate' | 'daily' | 'weekly';
  const countryId = formData.get('countryId') as string | null;

  const keywords = keywordsStr.split(',').map(k => k.trim()).filter(k => k.length > 0);

  if (!module || keywords.length === 0) {
    return;
  }

  try {
    await db.insert(userAlerts).values({
      userId: user.id,
      module,
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
