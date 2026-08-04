import React from 'react';
import Link from 'next/link';
import { db, safeQuery } from '@/lib/db/client';
import { users } from '@/lib/db/schema/users';
import { eq } from 'drizzle-orm';
import { CheckCircle2, AlertCircle, ArrowLeft, MailX } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface UnsubscribePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const params = await searchParams;
  const userId = typeof params.user_id === 'string' ? params.user_id : undefined;

  let success = false;
  let errorMsg = '';

  if (userId) {
    try {
      await db
        .update(users)
        .set({ emailUpdates: false })
        .where(eq(users.id, userId));
      success = true;
    } catch (err) {
      console.error('Failed to update unsubscribe in page:', err);
      errorMsg = 'Could not update your email preferences. Please try again.';
    }
  } else {
    errorMsg = 'No user account identifier was provided in the unsubscribe link.';
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center backdrop-blur-xl">
        {success ? (
          <>
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Unsubscribed Successfully</h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              You have been unsubscribed from AkiliBrain opportunity recommendations and alert emails. You will no longer receive proactive alerts.
            </p>
            <div className="space-y-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center w-full px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition-all shadow-lg shadow-emerald-500/20 text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to AkiliBrain
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <MailX className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Unable to Unsubscribe</h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              {errorMsg}
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center w-full px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-all text-sm border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to AkiliBrain
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
