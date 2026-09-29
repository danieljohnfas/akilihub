import Link from 'next/link';
import { ArrowLeft, MailX, BellRing, Sparkles } from 'lucide-react';
import { setEmailPreference } from './actions';
import { isUuid } from '@/lib/cv-session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Email preferences | AkiliBrain', robots: { index: false, follow: false } };

interface UnsubscribePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

const ERRORS: Record<string, string> = {
  invalid: 'No valid user account identifier was provided in the link.',
  busy: 'Too many attempts. Please wait a few minutes and try again.',
  failed: 'Could not update your email preferences. Please try again.',
};

const primaryLink =
  'inline-flex items-center justify-center w-full px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-all text-sm border border-slate-700';

/**
 * Rendering this page NEVER changes anything. The change happens only when the user presses
 * a button (POST via a server action). It used to update the DB during render, so mail
 * scanners / link prefetchers / crawlers unsubscribed people without their action.
 */
export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const params = await searchParams;
  const rawId = one(params.user_id);
  const userId = rawId && isUuid(rawId) ? rawId : undefined;
  const done = one(params.done);
  const error = one(params.error);

  const state = error ? 'error' : done === 'unsubscribed' ? 'unsubscribed' : done === 'resubscribed' ? 'resubscribed' : userId ? 'confirm' : 'error';
  const errorMsg = ERRORS[error ?? 'invalid'] ?? ERRORS.invalid;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center backdrop-blur-xl">
        {state === 'confirm' && (
          <>
            <div className="w-16 h-16 bg-slate-800 border border-slate-700 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <MailX className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Unsubscribe from emails?</h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              You will stop receiving AkiliBrain digests, alerts and recommendations. Account emails such as password resets are not affected.
            </p>
            <form action={setEmailPreference} className="space-y-3">
              <input type="hidden" name="user_id" value={userId} />
              <input type="hidden" name="intent" value="unsubscribe" />
              <button type="submit" className="inline-flex items-center justify-center w-full px-5 py-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-semibold transition-all text-sm">
                Yes, unsubscribe me
              </button>
            </form>
            <Link href="/" className={`${primaryLink} mt-3`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Keep my subscription
            </Link>
          </>
        )}

        {state === 'resubscribed' && (
          <>
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <BellRing className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome Back!</h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              You are now re-subscribed to AkiliBrain digests and opportunity recommendations.
            </p>
            <Link href="/" className={primaryLink}>
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

            {userId && (
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 mb-6 text-left">
                <p className="text-xs text-slate-400 mb-3">Unsubscribed by mistake or want to stay in the loop?</p>
                <form action={setEmailPreference}>
                  <input type="hidden" name="user_id" value={userId} />
                  <input type="hidden" name="intent" value="resubscribe" />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Re-subscribe to Updates
                  </button>
                </form>
              </div>
            )}

            <Link href="/" className={primaryLink}>
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
            <p className="text-slate-400 text-sm leading-relaxed mb-8">{errorMsg}</p>
            <Link href="/" className={primaryLink}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to AkiliBrain
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
