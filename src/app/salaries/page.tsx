import { db, safeQuery } from '@/lib/db/client';
import { salarySubmissions, employers } from '@/lib/db/schema/salaries';
import { countries } from '@/lib/db/schema/shared';
import { eq, desc, ilike, and } from 'drizzle-orm';
import { SalaryCard } from '@/components/salaries/SalaryCard';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Search, SlidersHorizontal, Banknote } from 'lucide-react';
import { SubmitSalaryModal } from '@/components/salaries/SubmitSalaryModal';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Salary Database East Africa | AkiliBrain',
  description:
    'Explore transparent, crowdsourced salary data for public and private sector roles across Kenya, Tanzania, Uganda, and Rwanda. Negotiate better compensation with real market data.',
  keywords: [
    'salary Kenya 2024',
    'salary database East Africa',
    'average salary Kenya',
    'software engineer salary Kenya',
    'government salary Kenya',
    'salary comparison Africa',
    'compensation data Tanzania',
    'pay scale Uganda',
    'salary negotiation Africa',
  ],
  openGraph: {
    title: 'Salary Database East Africa | AkiliBrain',
    description:
      'Crowdsourced compensation data for public and private sector roles across Kenya, Tanzania, Uganda, and Rwanda.',
    url: 'https://akilibrain.com/salaries',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Salary Database East Africa | AkiliBrain',
    description: 'Real salary data for East Africa — negotiate your next offer with confidence.',
  },
  alternates: {
    canonical: 'https://akilibrain.com/salaries',
  },
};

export default async function SalariesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; level?: string }>;
}) {
  const params = await searchParams;
  const q = params.q || '';
  const level = params.level || 'all';
  
  const conditions = [
    q ? ilike(salarySubmissions.jobTitle, `%${q}%`) : undefined,
    level && level !== 'all' ? eq(salarySubmissions.experienceLevel, level as never) : undefined,
  ].filter(Boolean);

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await safeQuery(db
    .select({
      salary: salarySubmissions,
      employer: employers,
      country: countries.name,
    })
    .from(salarySubmissions)
    .leftJoin(employers, eq(salarySubmissions.employerId, employers.id))
    .innerJoin(countries, eq(salarySubmissions.countryId, countries.id))
    .where(whereClause)
    .orderBy(desc(salarySubmissions.submittedAt))
    .limit(20));

  const allCountries = await safeQuery(db.select().from(countries).orderBy(countries.name));

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Salary Database</h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Explore transparent salary data for public and private sector roles across the continent.
          </p>
        </div>
        
        <form className="w-full md:w-auto flex items-center gap-2" action="/salaries" method="GET">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              name="q"
              placeholder="Search job titles..." 
              className="pl-9 bg-white/5 border-white/10 focus-visible:ring-primary/50"
              defaultValue={q}
            />
            {level && level !== 'all' && <input type="hidden" name="level" value={level} />}
          </div>
          <Button variant="outline" size="icon" type="button" className="shrink-0 bg-white/5 border-white/10 mr-2">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <SubmitSalaryModal countries={allCountries} />
        </form>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['all', 'entry', 'mid', 'senior', 'executive'].map((l) => (
          <Link key={l} href={`/salaries?${new URLSearchParams({ ...(q ? { q } : {}), ...(l !== 'all' ? { level: l } : {}) }).toString()}`}>
            <Button
              variant={level === l || (l === 'all' && !level) ? 'default' : 'secondary'}
              size="sm"
              className="rounded-full capitalize"
            >
              {l}
            </Button>
          </Link>
        ))}
      </div>

      {/* Disclaimer Banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-sm text-amber-300/80">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
        <p>
          <span className="font-semibold text-amber-300">Crowdsourced data.</span>{' '}
          Salary entries are submitted anonymously by community members and are not independently verified unless marked{' '}
          <span className="font-semibold text-emerald-400">Verified</span>. Use this data as a reference only.
        </p>
      </div>

      {/* Grid */}
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center border border-white/10 rounded-xl bg-white/5 border-dashed">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Banknote className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No salaries found</h3>
          <p className="text-muted-foreground max-w-md">
            We couldn&apos;t find any salary data matching your current search criteria.
          </p>
          {(q || (level && level !== 'all')) && (
            <Link href="/salaries" className={buttonVariants({ variant: "outline", className: "mt-6" })}>
              Clear all filters
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map(({ salary, employer, country }) => (
            <SalaryCard
              key={salary.id}
              id={salary.id}
              jobTitle={salary.jobTitle}
              employerName={employer?.name}
              sector={employer?.sector || undefined}
              country={country || 'Unknown'}
              experienceLevel={salary.experienceLevel}
              employmentType={salary.employmentType}
              grossMonthlySalary={Number(salary.grossMonthlySalary)}
              currency={salary.currency}
              isVerified={salary.isVerified}
              submittedAt={salary.submittedAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
