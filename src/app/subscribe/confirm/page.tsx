import Link from 'next/link';
import { ArrowLeft, BellRing, MailX } from 'lucide-react';
import { confirmSubscription } from './actions';
import { isUuid } from '@/lib/cv-session';
import { verifyToken } from '@/lib/security/tokens';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Confirm subscription | AkiliBrain', robots: { index: false, follow: false } };

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

export default async function ConfirmSubscriptionPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = one(params.status);
  const u = one(params.u);
  const t = one(params.t);
  const linkValid = Boolean(u && t && isUuid(u) && verifyToken('confirm', u, t));

  const view: 'confirm' | 'done' | 'problem' = status === 'done' ? 'done' : linkValid && !status ? 'confirm' : 'problem';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
        {view === 'confirm' && (
          <>
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <BellRing className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Confirm your subscription</h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              Click the button to start receiving AkiliBrain tender, job and compliance updates. You can unsubscribe with one click from any email.
            </p>
            <form action={confirmSubscription}>
              <input type="hidden" name="u" value={u} />
              <input type="hidden" name="t" value={t} />
              <button
                type="submit"
                className="inline-flex items-center justify-center w-full px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition-all text-sm"
              >
                Yes, subscribe me
              </button>
            </form>
          </>
        )}

        {view === 'done' && (
          <>
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <BellRing className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">You&apos;re subscribed</h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">Thanks! Watch your inbox for the next digest.</p>
          </>
        )}

        {view === 'problem' && (
          <>
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <MailX className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Link not valid</h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              {status === 'busy'
                ? 'Too many attempts. Please wait a few minutes and try again.'
                : status === 'error'
                  ? 'We could not save your choice. Please try the link again.'
                  : 'This confirmation link is invalid or incomplete. Please subscribe again from the website.'}
            </p>
          </>
        )}

        <Link
          href="/"
          className="inline-flex items-center justify-center w-full px-5 py-3 mt-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-all text-sm border border-slate-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Return to AkiliBrain
        </Link>
      </div>
    </div>
  );
}
