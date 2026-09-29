'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Loader2, Send, ShieldCheck } from 'lucide-react';

type Status = 'idle' | 'loading' | 'sent' | 'error';

/**
 * Newsletter signup. Posts to /api/subscribe (double opt-in: the user must click the emailed link).
 * It used to fake a success message without ever calling the API.
 */
export function NewsletterForm({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  async function handleSubscribe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.get('email'), website: data.get('website') || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Something went wrong. Please try again.');
      setMessage(body.message || 'Check your inbox to confirm your subscription.');
      setStatus('sent');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div role="status" className="p-6 rounded-2xl bg-green-500/10 border border-green-500/20 text-center animate-in fade-in zoom-in duration-300">
        <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
        <h3 className="text-xl font-bold mb-2">Check your inbox</h3>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-2' : 'max-w-md w-full mx-auto space-y-4'}>
      <form onSubmit={handleSubscribe} className={compact ? 'flex gap-2' : 'flex flex-col sm:flex-row gap-2'}>
        {/* Honeypot: hidden from people, tempting to bots */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <Input
          type="email"
          name="email"
          required
          maxLength={254}
          placeholder={compact ? 'Email address...' : 'Enter your email address'}
          aria-label="Email address"
          className={compact ? 'bg-black/20 border-white/10 focus-visible:ring-primary/50' : 'h-12 bg-white/5 border-white/10'}
        />
        {compact ? (
          <Button type="submit" size="icon" disabled={status === 'loading'} aria-label="Subscribe to newsletter" className="shrink-0 transition-transform active:scale-95">
            {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        ) : (
          <Button type="submit" disabled={status === 'loading'} className="h-12 px-8">
            {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Subscribe'}
          </Button>
        )}
      </form>
      {status === 'error' && (
        <p role="alert" className="text-sm text-red-400">
          {message}
        </p>
      )}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="w-4 h-4 text-green-400" />
        <span>Confirm by email. 1-click unsubscribe anytime. We never sell your data.</span>
      </div>
    </div>
  );
}
