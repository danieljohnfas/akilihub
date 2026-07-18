'use client';

import Link from 'next/link';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service in production
    console.error('[AkiliBrain Error]', error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-red-500/10 ring-1 ring-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-12 h-12 text-red-400/70" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-red-500/5 blur-xl -z-10 scale-150" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <p className="text-sm font-semibold tracking-widest text-red-400/70 uppercase">
            Something went wrong
          </p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            We hit a snag
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
            AkiliBrain encountered an unexpected error. Our team has been notified.
            Please try again or return to the homepage.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground/50 font-mono">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button
            onClick={reset}
            className={buttonVariants({ size: 'lg', className: 'rounded-full' })}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>
          <Link
            href="/"
            className={buttonVariants({ variant: 'outline', size: 'lg', className: 'rounded-full bg-white/5 border-white/10' })}
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
