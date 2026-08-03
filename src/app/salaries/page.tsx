import { db, safeQuery } from '@/lib/db/client';
import { salarySubmissions, employers } from '@/lib/db/schema/salaries';
import { countries } from '@/lib/db/schema/shared';
import { eq, desc, ilike, and, count } from 'drizzle-orm';
import { SalaryCard } from '@/components/salaries/SalaryCard';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Search, SlidersHorizontal, Banknote, MapPin, Building2 } from 'lucide-react';
import { SubmitSalaryModal } from '@/components/salaries/SubmitSalaryModal';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildSalaryListSchema, buildBreadcrumbSchema } from '@/components/seo/schemas';
import { parseGlobalSearchParams } from '@/lib/filters';
import { GlobalFilterBar, FilterConfig } from '@/components/shared/GlobalFilterBar';
import { PremiumBanner } from '@/components/shared/PremiumBanner';
import { AdSlot } from '@/components/shared/AdSlot';

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

import { Suspense } from 'react';
import { unstable_cache } from 'next/cache';

const getAllCountries = unstable_cache(async () => {
  return await safeQuery(db.select().from(countries).orderBy(countries.name));
}, ['all-countries-list'], { revalidate: 3600 });

export default async function SalariesPage({
  searchParams: rawParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = parseGlobalSearchParams(await rawParams);
  const allCountries = await getAllCountries();

  const salaryFilters: FilterConfig[] = [
    {
      id: 'q',
      type: 'search',
      label: 'Role / Title',
      placeholder: 'Search job titles...',
    },
    {
      id: 'company',
      type: 'search',
      label: 'Employer',
      placeholder: 'Company name...',
      icon: <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />,
    },
    {
      id: 'country',
      type: 'select',
      label: 'Location',
      icon: <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />,
      options: [
        { value: 'all', label: 'All Locations' },
        ...allCountries.map(c => ({ value: c.name, label: c.name }))
      ],
      defaultValue: 'all'
    },
    {
      id: 'level',
      type: 'pills',
      options: [
        { value: 'all', label: 'All Seniority' },
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
      <Suspense fallback={
        <div className="py-24 px-4 text-center">
          <h3 className="text-xl font-semibold mb-2 animate-pulse text-muted-foreground">Loading salary data...</h3>
        </div>
      }>
        <SalariesList params={params} />
      </Suspense>

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

async function SalariesList({ params }: { params: ReturnType<typeof parseGlobalSearchParams> }) {
  const { q, company, country, level, page } = params;
  const PAGE_SIZE = 30;
  const offset = (page - 1) * PAGE_SIZE;
  
  const conditions = [
    q ? ilike(salarySubmissions.jobTitle, `%${q}%`) : undefined,
    level && level !== 'all' ? eq(salarySubmissions.experienceLevel, level as never) : undefined,
    company ? ilike(employers.name, `%${company}%`) : undefined,
    country && country !== 'all' ? ilike(countries.name, `%${country}%`) : undefined,
  ].filter(Boolean);

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const totalCountResult = await safeQuery(
    db.select({ value: count() })
      .from(salarySubmissions)
      .leftJoin(employers, eq(salarySubmissions.employerId, employers.id))
      .leftJoin(countries, eq(salarySubmissions.countryId, countries.id))
      .where(whereClause)
  );
  const totalCount = totalCountResult?.[0]?.value || 0;

  const data = await safeQuery(db
    .select({
      salary: salarySubmissions,
      employer: employers,
      country: countries.name,
    })
    .from(salarySubmissions)
    .leftJoin(employers, eq(salarySubmissions.employerId, employers.id))
    .leftJoin(countries, eq(salarySubmissions.countryId, countries.id))
    .where(whereClause)
    .orderBy(desc(salarySubmissions.submittedAt))
    .limit(PAGE_SIZE)
    .offset(offset));

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

  const getPageUrl = (newPage: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (company) sp.set('company', company);
    if (country && country !== 'all') sp.set('country', country);
    if (level && level !== 'all') sp.set('level', level);
    if (newPage > 1) sp.set('page', newPage.toString());
    const qs = sp.toString();
    return `/salaries${qs ? `?${qs}` : ''}`;
  };

  return (
    <>
      {data.length > 0 && <JsonLd schema={salarySchema} />}
      <JsonLd schema={breadcrumbSchema} />
      
      {totalCount > 0 && (
        <div className="flex justify-center -mt-4 mb-8">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-white/70">
            Showing <span className="text-white mx-1">{data.length}</span> of <span className="text-white mx-1">{totalCount}</span> salary records
          </div>
        </div>
      )}

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
            {(q || company || (country && country !== 'all') || (level && level !== 'all')) && (
              <Link href="/salaries" className={buttonVariants({ variant: "outline", className: "mt-6" })}>
                Clear all filters
              </Link>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="mb-6">
            <PremiumBanner />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="col-span-1">
              <AdSlot slotId="salaries-sidebar-1" />
            </div>
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
        </>
      )}

      {/* Pagination */}
      {data.length > 0 && (
        <div className="flex items-center justify-center gap-4 pt-6 border-t border-white/5 mt-8">
          {page > 1 && (
            <Link
              href={getPageUrl(page - 1)}
              className={buttonVariants({ variant: 'outline' })}
            >
              ← Previous
            </Link>
          )}
          <span className="text-sm text-muted-foreground">Page {page}</span>
          {offset + data.length < totalCount && (
            <Link
              href={getPageUrl(page + 1)}
              className={buttonVariants({ variant: 'outline' })}
            >
              Next →
            </Link>
          )}
        </div>
      )}

      {/* SEO-rich Content Block for AdSense / Googlebot */}
      <section className="mt-16 space-y-8 text-muted-foreground border-t border-white/5 pt-12">
        <div className="border border-white/10 rounded-xl p-6 bg-white/5">
          <h2 className="text-2xl font-bold text-foreground mb-3">About the AkiliBrain Salary Database</h2>
          <p className="leading-relaxed">
            The AkiliBrain Salary Database provides transparent, verified compensation data for professionals across Kenya, Tanzania, Uganda, Rwanda, and the wider African market. We aim to empower job seekers and employers with accurate insights into base salaries, bonuses, and equity compensation across various industries. By providing a clear picture of market rates, we help democratize the negotiation process.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-white/10 rounded-xl p-6 bg-white/5">
            <h2 className="text-xl font-semibold text-foreground mb-3">Why Salary Transparency Matters</h2>
            <ul className="space-y-2 text-sm list-disc list-inside">
              <li><strong>Empowers candidates:</strong> Walk into your next interview knowing exactly what your skills are worth.</li>
              <li><strong>Helps employers:</strong> Benchmark your compensation packages to attract and retain top talent.</li>
              <li><strong>Reduces the gender pay gap:</strong> Exposing disparities is the first step toward correcting them.</li>
              <li><strong>Highlights regional differences:</strong> Understand how pay scales vary between Nairobi, Dar es Salaam, and Kigali.</li>
            </ul>
          </div>
          <div className="border border-white/10 rounded-xl p-6 bg-white/5">
            <h2 className="text-xl font-semibold text-foreground mb-3">How We Collect Data</h2>
            <ul className="space-y-2 text-sm list-disc list-inside">
              <li><strong>Anonymous Submissions:</strong> Professionals securely share their compensation details.</li>
              <li><strong>Verification:</strong> We cross-reference submissions with market averages and employer data.</li>
              <li><strong>Aggregated Insights:</strong> Data is anonymized and aggregated to protect individual privacy.</li>
              <li><strong>Market Research:</strong> We analyze publicly available data and partner with recruitment agencies.</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
