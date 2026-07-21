import { db, safeQuery } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { tenders } from '@/lib/db/schema/tenders';
import { countries } from '@/lib/db/schema/shared';
import { count, eq, or, isNull, gt, and } from 'drizzle-orm';
import { Briefcase, FileText, Globe } from 'lucide-react';

export async function LiveStats() {
  const activeJobsCount = await safeQuery(
    db.select({ value: count() }).from(jobs).where(
      and(
        eq(jobs.isActive, true),
        or(isNull(jobs.deadline), gt(jobs.deadline, new Date()))
      )
    )
  );

  const openTendersCount = await safeQuery(
    db.select({ value: count() }).from(tenders).where(eq(tenders.status, 'open'))
  );

  const countriesCount = await safeQuery(
    db.select({ value: count() }).from(countries)
  );

  const stats = [
    { label: 'Active Jobs', value: activeJobsCount?.[0]?.value || 0, icon: Briefcase, color: 'text-amber-500' },
    { label: 'Open Tenders', value: openTendersCount?.[0]?.value || 0, icon: FileText, color: 'text-blue-500' },
    { label: 'Countries', value: countriesCount?.[0]?.value || 0, icon: Globe, color: 'text-emerald-500' },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 mt-8 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm mx-auto max-w-fit">
      {stats.map((stat, i) => (
        <div key={stat.label} className="flex items-center gap-3 px-2">
          <div className={`p-2 rounded-lg bg-black/20 ring-1 ring-white/10 ${stat.color}`}>
            <stat.icon className="w-5 h-5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-2xl font-bold text-foreground leading-none">{stat.value.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-1">{stat.label}</span>
          </div>
          {i < stats.length - 1 && (
            <div className="hidden sm:block w-px h-10 bg-white/10 ml-6" />
          )}
        </div>
      ))}
    </div>
  );
}
