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
import { JsonLd } from '@/components/seo/JsonLd';
import { buildSalaryListSchema, buildBreadcrumbSchema } from '@/components/seo/schemas';
import { GlobalFilterBar, FilterConfig } from '@/components/shared/GlobalFilterBar';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Salary Database East Africa',
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
    title: 'Salary Database East Africa',
    description:
      'Crowdsourced compensation data for public and private sector roles across Kenya, Tanzania, Uganda, and Rwanda.',
    url: 'https://akilibrain.com/salaries',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Salary Database East Africa',
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

  const salarySchema = buildSalaryListSchema(
    data.slice(0, 20).map(({ salary, country }) => ({
      jobTitle: salary.jobTitle,
      country: country ?? null,
      currency: salary.currency,
      grossMonthlySalary: Number(salary.grossMonthlySalary),
      experienceLevel: salary.experienceLevel,
    }))
  );

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: 'https://akilibrain.com' },
    { name: 'Salary Database', url: 'https://akilibrain.com/salaries' },
  ]);

  const salaryFilters: FilterConfig[] = [
    {
      id: 'q',
      type: 'search',
      label: 'Search Job Titles',
      placeholder: 'Search job titles...',
    },
    {
      id: 'level',
      type: 'pills',
      options: [
        { value: 'all', label: 'All Levels' },
        { value: 'entry', label: 'Entry' },
        { value: 'mid', label: 'Mid' },
        { value: 'senior', label: 'Senior' },
        { value: 'executive', label: 'Executive' },
      ],
      defaultValue: 'all'
    }
  ];

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8">
      {data.length > 0 && <JsonLd schema={salarySchema} />}
      <JsonLd schema={breadcrumbSchema} />
      {/* Header & Search */}
      <div className="flex flex-col items-center text-center gap-6 border-b border-white/5 pb-10 mb-6">
        <div className="space-y-4 flex flex-col items-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Salary Database</h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            Explore transparent salary data for public and private sector roles across the continent.
          </p>
        </div>
      </div>

      <GlobalFilterBar filters={salaryFilters}>
        <SubmitSalaryModal countries={allCountries} />
      </GlobalFilterBar>

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
        <>
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-white/10 rounded-xl bg-white/5 border-dashed">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Banknote className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Salary data coming soon</h3>
            <p className="text-muted-foreground max-w-md">
              We are actively crowdsourcing and verifying salary data across East Africa to build the most comprehensive compensation database. Check back soon.
            </p>
            {(q || (level && level !== 'all')) && (
              <Link href="/salaries" className={buttonVariants({ variant: "outline", className: "mt-6" })}>
                Clear all filters
              </Link>
            )}
          </div>

          {/* SEO-rich static content for Googlebot when DB is empty */}
          <section className="mt-12 space-y-8 text-muted-foreground">
            <div className="border border-white/10 rounded-xl p-6 bg-white/5">
              <h2 className="text-xl font-bold text-foreground mb-3">About the AkiliBrain Salary Database</h2>
              <p className="leading-relaxed">
                The AkiliBrain Salary Database provides transparent, verified compensation data for professionals across Kenya, Tanzania, Uganda, Rwanda, and the wider African market. We aim to empower job seekers and employers with accurate insights into base salaries, bonuses, and equity compensation across various industries.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-white/10 rounded-xl p-6 bg-white/5">
                <h2 className="text-lg font-semibold text-foreground mb-2">Why Salary Transparency Matters</h2>
                <ul className="space-y-1 text-sm list-disc list-inside">
                  <li>Empowers candidates during salary negotiations</li>
                  <li>Helps employers benchmark their compensation packages</li>
                  <li>Reduces the gender pay gap by exposing disparities</li>
                  <li>Highlights regional pay differences across East Africa</li>
                  <li>Tracks compensation trends for in-demand roles (e.g., Software Engineering)</li>
                </ul>
              </div>
              <div className="border border-white/10 rounded-xl p-6 bg-white/5">
                <h2 className="text-lg font-semibold text-foreground mb-2">How We Collect Data</h2>
                <ul className="space-y-1 text-sm list-disc list-inside">
                  <li><strong>Anonymous Submissions:</strong> Professionals securely share their compensation details.</li>
                  <li><strong>Verification:</strong> We cross-reference submissions with market averages and employer data.</li>
                  <li><strong>Aggregated Insights:</strong> Data is anonymized and aggregated to protect individual privacy.</li>
                  <li><strong>Market Research:</strong> We analyze publicly available data and partner with recruitment agencies.</li>
                </ul>
              </div>
            </div>
          </section>
        </>
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

      {/* SEO: Internal linking */}
      <div className="border-t border-white/5 pt-10 mt-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-6">Browse Salaries by Role</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[
            { label: 'Software Engineer Salaries', href: '/salaries?q=software+engineer' },
            { label: 'Nurse Salaries', href: '/salaries?q=nurse' },
            { label: 'Teacher Salaries', href: '/salaries?q=teacher' },
            { label: 'Finance & Accounting', href: '/salaries?q=accountant' },
            { label: 'Senior Level Salaries', href: '/salaries?level=senior' },
            { label: 'Entry Level Salaries', href: '/salaries?level=entry' },
            { label: 'Executive Salaries', href: '/salaries?level=executive' },
            { label: 'Mid Level Salaries', href: '/salaries?level=mid' },
          ].map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
