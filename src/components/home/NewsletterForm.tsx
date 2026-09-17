'use client';

import { useTransition, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';

export function NewsletterForm() {
  const [isPending, startTransition] = useTransition();
  const [optimisticSubscribed, setOptimisticSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOptimisticSubscribed(true);

    startTransition(async () => {
      // Fake delay to show background work while UI is already updated
      await new Promise(r => setTimeout(r, 1000));
    });
  };

  if (optimisticSubscribed) {
    return (
      <div className="p-6 rounded-2xl bg-green-500/10 border border-green-500/20 text-center animate-in fade-in zoom-in duration-300">
        <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
        <h3 className="text-xl font-bold mb-2">You're on the list!</h3>
        <p className="text-sm text-muted-foreground">
          Watch your inbox. If you ever want to leave, there's a 1-click unsubscribe at the bottom of every email.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full mx-auto space-y-4">
      <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
        <Input 
          type="email" 
          required 
          placeholder="Enter your email address" 
          className="h-12 bg-white/5 border-white/10"
        />
        <Button 
          type="submit" 
          disabled={isPending}
          className="h-12 px-8"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Subscribe'}
        </Button>
      </form>
      
      {/* 
        UX Rule 5: No Dark Patterns. 
        Explicitly declaring data safety and easy cancellation builds trust.
      */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="w-4 h-4 text-green-400" />
        <span>No spam. 1-click unsubscribe anytime. We never sell your data.</span>
      </div>
    </div>
  );
}
