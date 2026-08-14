import React from 'react';
import Link from 'next/link';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema/users';
import { eq } from 'drizzle-orm';
import { ArrowLeft, MailX, BellRing, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface UnsubscribePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const params = await searchParams;
  const userId = typeof params.user_id === 'string' ? params.user_id : undefined;
  const isResubscribe = params.action === 'resubscribe';

  let state: 'unsubscribed' | 'resubscribed' | 'error' = 'error';
  let errorMsg = '';

  if (userId) {
    try {
      if (isResubscribe) {
        await db
          .update(users)
          .set({ emailUpdates: true })
          .where(eq(users.id, userId));
        state = 'resubscribed';
      } else {
        await db
          .update(users)
          .set({ emailUpdates: false })
          .where(eq(users.id, userId));
        state = 'unsubscribed';
      }
    } catch (err) {
      console.error('Failed to update email preference:', err);
      errorMsg = 'Could not update your email preferences. Please try again.';
    }
  } else {
    errorMsg = 'No valid user account identifier was provided in the link.';
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center backdrop-blur-xl">
        {state === 'resubscribed' && (
          <>
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <BellRing className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome Back!</h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              You are now re-subscribed to AkiliBrain intelligence digests and opportunity recommendations. You&apos;ll receive fresh tenders and job alerts matching your interests.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center w-full px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition-all shadow-lg shadow-emerald-500/20 text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to AkiliBrain
            </Link>
          </>
        )}

        {state === 'unsubscribed' && (
          <>
            <div className="w-16 h-16 bg-slate-800 border border-slate-700 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <MailX className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Unsubscribed</h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              You have been unsubscribed from opportunity recommendations and digest emails.
            </p>
            
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 mb-6 text-left">
              <p className="text-xs text-slate-400 mb-3">
                Unsubscribed by mistake or want to stay in the loop?
              </p>
              <Link
                href={`/unsubscribe?user_id=${userId}&action=resubscribe`}
                className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Re-subscribe to Updates
              </Link>
            </div>

            <Link
              href="/"
              className="inline-flex items-center justify-center w-full px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-all text-sm border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Homepage
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <MailX className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Action Incomplete</h1>
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
