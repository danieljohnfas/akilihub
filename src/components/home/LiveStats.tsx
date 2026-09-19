import { Briefcase, FileText, Globe, Banknote, ShieldCheck, Activity } from 'lucide-react';

export async function LiveStats({ 
  jobsTotal = 4500, 
  tendersTotal = 3404, 
  countriesTotal = 12,
  complianceTotal = 1322,
  healthTotal = 2869,
  salariesTotal = 1161,
}: { 
  jobsTotal?: number;
  tendersTotal?: number;
  countriesTotal?: number;
  complianceTotal?: number;
  healthTotal?: number;
  salariesTotal?: number;
}) {
  const stats = [
    { label: 'Active Jobs', value: jobsTotal, icon: Briefcase, color: 'text-amber-500' },
    { label: 'Open Tenders', value: tendersTotal, icon: FileText, color: 'text-blue-500' },
    { label: 'Salary Benchmarks', value: salariesTotal, icon: Banknote, color: 'text-emerald-500' },
    { label: 'Compliance Guides', value: complianceTotal, icon: ShieldCheck, color: 'text-purple-500' },
    { label: 'Health Indicators', value: healthTotal, icon: Activity, color: 'text-teal-500' },
    { label: 'Countries Covered', value: countriesTotal, icon: Globe, color: 'text-indigo-500' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6 mt-8 p-4 sm:p-6 rounded-2xl bg-card border border-border shadow-sm backdrop-blur-sm mx-auto max-w-5xl">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center gap-3 px-2 py-1">
          <div className={`p-2 rounded-lg bg-muted ring-1 ring-border dark:bg-black/20 dark:ring-white/10 ${stat.color} shrink-0`}>
            <stat.icon className="w-5 h-5" />
          </div>
          <div className="flex flex-col text-left min-w-0">
            <span className="text-xl sm:text-2xl font-bold text-foreground leading-none truncate">
              {stat.value.toLocaleString()}
            </span>
            <span className="text-[11px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium mt-1 truncate">
              {stat.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
