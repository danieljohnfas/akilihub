import { db, safeQuery } from '@/lib/db/client';
import { salarySubmissions, employers } from '@/lib/db/schema/salaries';
import { countries } from '@/lib/db/schema/shared';
import { eq, desc, ilike, and } from 'drizzle-orm';
import { SalaryCard } from '@/components/salaries/SalaryCard';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Search, SlidersHorizontal, Banknote } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Salary Database | AkiliBrain',
  description: 'Explore verified government and private sector salaries across Africa.',
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
          <Button variant="outline" size="icon" type="button" className="shrink-0 bg-white/5 border-white/10">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
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
