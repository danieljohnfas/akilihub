import Link from 'next/link';
import { FileQuestion, Home, Search, Briefcase, FileText, ShieldCheck } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        {/* Brand mark */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
              <FileQuestion className="w-12 h-12 text-primary/60" />
            </div>
            {/* Glow */}
            <div className="absolute inset-0 rounded-2xl bg-primary/5 blur-xl -z-10 scale-150" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <p className="text-sm font-semibold tracking-widest text-primary/70 uppercase">
            404 — Page Not Found
          </p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            This page doesn&apos;t exist
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
            The record you&apos;re looking for may have been removed, expired, or the link might be incorrect.
          </p>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
          {[
            { label: 'Browse Tenders', href: '/tenders', icon: FileText, color: 'text-blue-400' },
            { label: 'Find Jobs', href: '/jobs', icon: Briefcase, color: 'text-amber-400' },
            { label: 'Compliance', href: '/compliance', icon: ShieldCheck, color: 'text-purple-400' },
          ].map(({ label, href, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all group"
            >
              <Icon className={`w-5 h-5 ${color} group-hover:scale-110 transition-transform`} />
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
            </Link>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link href="/" className={buttonVariants({ size: 'lg', className: 'rounded-full' })}>
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Link>
          <Link href="/jobs" className={buttonVariants({ variant: 'outline', size: 'lg', className: 'rounded-full bg-white/5 border-white/10' })}>
            <Search className="w-4 h-4 mr-2" />
            Search Opportunities
          </Link>
        </div>
      </div>
    </div>
  );
}
