import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';

export function PremiumBanner() {
  return (
    <div className="w-full relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 p-6 my-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-primary/5">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Sparkles className="w-24 h-24" />
      </div>
      <div className="relative z-10 flex-1 space-y-2 text-center md:text-left">
        <h3 className="text-xl font-bold flex items-center justify-center md:justify-start gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Unlock AkiliBrain <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-sm ml-1">PRO</span>
        </h3>
        <p className="text-muted-foreground">
          Get unlimited access to historical data, AI-driven insights, advanced filters, and priority alerts.
        </p>
      </div>
      <div className="relative z-10 shrink-0">
        <Link href="/pricing" className={buttonVariants({ variant: "default", size: "lg", className: "rounded-full shadow-lg hover:shadow-primary/25 transition-all hover:scale-105" })}>
          Upgrade Now <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </div>
    </div>
  );
}
