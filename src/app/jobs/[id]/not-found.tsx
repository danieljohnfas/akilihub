import Link from 'next/link';
import { Briefcase, ArrowLeft, Search } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

export default function JobNotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-xl mx-auto text-center space-y-8">
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20 flex items-center justify-center">
              <Briefcase className="w-10 h-10 text-amber-400/60" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-amber-500/5 blur-xl -z-10 scale-150" />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold tracking-widest text-amber-400/70 uppercase">
            Job No Longer Available
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            This listing has expired
          </h1>
          <p className="text-muted-foreground text-base max-w-sm mx-auto leading-relaxed">
            This job posting may have been filled, removed by the employer, or the link
            is no longer valid. Explore thousands of fresh opportunities below.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link
            href="/jobs"
            className={buttonVariants({ size: 'lg', className: 'rounded-full' })}
          >
            <Search className="w-4 h-4 mr-2" />
            Browse Active Jobs
          </Link>
          <Link
            href="/"
            className={buttonVariants({ variant: 'outline', size: 'lg', className: 'rounded-full bg-white/5 border-white/10' })}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
