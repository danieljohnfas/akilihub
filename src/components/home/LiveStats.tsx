import { db, safeQuery } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { tenders } from '@/lib/db/schema/tenders';
import { countries } from '@/lib/db/schema/shared';
import { count, eq, or, isNull, gt, and } from 'drizzle-orm';
import { Briefcase, FileText, Globe } from 'lucide-react';

export async function LiveStats({ 
  jobsTotal = 780, 
  tendersTotal = 226, 
  countriesTotal = 9 
}: { 
  jobsTotal?: number;
  tendersTotal?: number;
  countriesTotal?: number;
}) {


  const stats = [
    { label: 'Active Jobs', value: jobsTotal, icon: Briefcase, color: 'text-amber-500' },
    { label: 'Open Tenders', value: tendersTotal, icon: FileText, color: 'text-blue-500' },
    { label: 'Countries', value: countriesTotal, icon: Globe, color: 'text-emerald-500' },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 mt-8 p-4 rounded-2xl bg-card border border-border shadow-sm backdrop-blur-sm mx-auto max-w-fit">
      {stats.map((stat, i) => (
        <div key={stat.label} className="flex items-center gap-3 px-2">
          <div className={`p-2 rounded-lg bg-muted ring-1 ring-border dark:bg-black/20 dark:ring-white/10 ${stat.color}`}>
            <stat.icon className="w-5 h-5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-2xl font-bold text-foreground leading-none">{stat.value.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-1">{stat.label}</span>
          </div>
          {i < stats.length - 1 && (
            <div className="hidden sm:block w-px h-10 bg-border ml-6" />
          )}
        </div>
      ))}
    </div>
  );
}
