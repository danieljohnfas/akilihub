import { db, safeQuery } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { countries, regions } from '@/lib/db/schema/shared';
import { eq, desc, ilike, and, or, isNull, gt, count } from 'drizzle-orm';
import { JobCard } from '@/components/jobs/JobCard';
import { GlobalFilterBar, FilterConfig } from '@/components/shared/GlobalFilterBar';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Inbox, Briefcase, Building2, MapPin, Filter, Clock, LayoutGrid, List } from 'lucide-react';
import Link from 'next/link';
import { EmptyStateLottie } from '@/components/ui/empty-state-lottie';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildItemListSchema, buildBreadcrumbSchema } from '@/components/seo/schemas';
import { parseGlobalSearchParams } from '@/lib/filters';
import { RelatedGuides } from '@/components/guides/RelatedGuides';
import { AdSlot } from '@/components/shared/AdSlot';
import { PremiumBanner } from '@/components/shared/PremiumBanner';
import React from 'react';

export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Jobs & Careers in East Africa',
  description:
    'Browse thousands of job openings and career opportunities across East Africa — Kenya, Tanzania, Uganda, Rwanda, Ethiopia, DRC, and the wider region. Full-time, part-time, remote, and internship roles updated daily.',
  keywords: [
    'jobs Kenya',
    'careers East Africa',
    'job vacancies East Africa',
    'jobs Tanzania',
    'jobs Uganda',
    'jobs Rwanda',
    'jobs Ethiopia',
    'jobs DRC',
    'remote jobs Africa',
    'internships East Africa',
    'graduate jobs Kenya',
    'job board Africa',
  ],
  openGraph: {
    title: 'Jobs & Careers in East Africa',
    description:
      'Discover thousands of active job openings across Kenya, Tanzania, Uganda, Rwanda, Ethiopia, DRC, and the wider region. Updated daily from across the web.',
    url: 'https://akilibrain.com/jobs',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jobs & Careers in East Africa',
    description: 'Discover thousands of active job openings across East Africa. Updated daily.',
  },
  alternates: {
    canonical: 'https://akilibrain.com/jobs',
  },
};

const PAGE_SIZE = 30;

import { Suspense } from 'react';
import { unstable_cache } from 'next/cache';

const getSortedCountries = unstable_cache(async () => {
  const countriesData = await safeQuery(db.select({ name: countries.name }).from(countries));
  return countriesData.map(c => c.name).sort();
}, ['countries-list'], { revalidate: 3600 });

export default async function JobsPage({
  searchParams: rawParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = parseGlobalSearchParams(await rawParams);
  const sortedCountries = await getSortedCountries();

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-6 border-b border-white/5 pb-10 mb-6">
        <div className="space-y-4 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center ring-1 ring-primary/30 mb-2">
            <Briefcase className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Jobs & Careers</h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            Discover active job opportunities across East Africa, automatically sourced from across the web.
          </p>
        </div>
      </div>

      <GlobalFilterBar
        filters={[
          {
            id: 'q',
            type: 'search',
            label: 'Job Title / Keyword',
            placeholder: 'Software engineer...',
          },
          {
            id: 'company',
            type: 'search',
            label: 'Who is recruiting?',
            placeholder: 'Company name...',
            icon: <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />,
          },
          {
            id: 'country',
            type: 'select',
            label: 'Location',
            icon: <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />,
            options: [
              { value: 'all', label: 'Everywhere' },
              ...sortedCountries.map(c => ({ value: c, label: c })),
            ],
            defaultValue: 'all',
          },
          {
            id: 'type',
            type: 'select',
            label: 'Job Type',
            icon: <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />,
            options: [
              { value: 'all', label: 'All Types' },
              { value: 'full_time', label: 'Full Time' },
              { value: 'part_time', label: 'Part Time' },
              { value: 'contract', label: 'Contract' },
              { value: 'internship', label: 'Internship' },
              { value: 'remote', label: 'Remote' },
            ],
            defaultValue: 'all',
          },
          {
            id: 'time',
            type: 'pills',
            options: [
              { value: 'all', label: 'Any time' },
              { value: '24h', label: 'Past 24 hours' },
              { value: '7d', label: 'Past week' },
              { value: '30d', label: 'Past month' },
            ],
            defaultValue: 'all',
          }
        ]}
      />

      {/* Grid */}
      <Suspense fallback={
        <div className="py-24 px-4 text-center">
          <h3 className="text-xl font-semibold mb-2 animate-pulse text-muted-foreground">Loading jobs...</h3>
        </div>
      }>
        <JobsList params={params} />
      </Suspense>

      {/* Related Guides Interweave */}
      <div className="pt-10 mt-8">
        <RelatedGuides category="jobs" title="Career & Interview Insights" />
      </div>

      {/* SEO: Internal linking — crawlable category / location links */}
      <div className="border-t border-white/5 pt-10 mt-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-6">Browse Popular Categories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[
            { label: 'Full Time Jobs', href: '/jobs?type=full_time' },
            { label: 'Remote Jobs in Africa', href: '/jobs?type=remote' },
            { label: 'Contract Jobs', href: '/jobs?type=contract' },
            { label: 'Internships & Graduate Jobs', href: '/jobs?type=internship' },
            { label: 'Jobs in Kenya', href: '/jobs?location=Kenya' },
            { label: 'Jobs in Tanzania', href: '/jobs?location=Tanzania' },
            { label: 'Jobs in Uganda', href: '/jobs?location=Uganda' },
            { label: 'Jobs in Rwanda', href: '/jobs?location=Rwanda' },
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

async function JobsList({ params }: { params: ReturnType<typeof parseGlobalSearchParams> }) {
  const { q, type, company, country, time, layout, page } = params;
  const offset = (page - 1) * PAGE_SIZE;

  const activeCondition = and(
    eq(jobs.isActive, true),
    or(isNull(jobs.deadline), gt(jobs.deadline, new Date()))
  );

  let countryId: string | undefined;
  let regionId: string | undefined;
  if (country) {
    const cRes = await safeQuery(db.select({ id: countries.id }).from(countries).where(eq(countries.name, country)).limit(1));
    if (cRes.length > 0) {
      countryId = cRes[0].id;
    } else {
      const rRes = await safeQuery(db.select({ id: regions.id }).from(regions).where(eq(regions.name, country)).limit(1));
      if (rRes.length > 0) regionId = rRes[0].id;
    }
  }

  const getConditions = (exclude?: 'q' | 'type' | 'company' | 'country' | 'time') => {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    return [
      activeCondition,
      exclude !== 'q' && q ? ilike(jobs.title, `%${q}%`) : undefined,
      exclude !== 'type' && type ? eq(jobs.jobType, type as never) : undefined,
      exclude !== 'company' && company ? eq(jobs.companyName, company) : undefined,
      exclude !== 'country' && countryId ? eq(jobs.countryId, countryId) : undefined,
      exclude !== 'country' && regionId ? eq(jobs.regionId, regionId) : undefined,
      exclude !== 'time' && time === '24h' ? gt(jobs.createdAt, new Date(now - 24 * 60 * 60 * 1000)) : undefined,
      exclude !== 'time' && time === '7d' ? gt(jobs.createdAt, new Date(now - 7 * 24 * 60 * 60 * 1000)) : undefined,
      exclude !== 'time' && time === '30d' ? gt(jobs.createdAt, new Date(now - 30 * 24 * 60 * 60 * 1000)) : undefined,
    ].filter(Boolean);
  };

  const conditions = getConditions();
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const totalCountResult = await safeQuery(
    db.select({ value: count() })
      .from(jobs)
      .where(whereClause)
  );
  const totalCount = totalCountResult?.[0]?.value || 0;

  const data = await safeQuery(
    db
      .select({
        job: jobs,
        country: countries.name,
        region: regions.name,
      })
      .from(jobs)
      .leftJoin(countries, eq(jobs.countryId, countries.id))
      .leftJoin(regions, eq(jobs.regionId, regions.id))
      .where(whereClause)
      .orderBy(desc(jobs.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset)
  );

  const hasFilters = q || type || company || country;

  const itemListSchema = buildItemListSchema(
    'Jobs & Careers in East Africa',
    'Active job openings across Kenya, Tanzania, Uganda, Rwanda, Ethiopia, DRC, and the wider region.',
    data.slice(0, 20).map(({ job, country }, idx) => ({
      position: idx + 1,
      name: `${job.title} at ${job.companyName}`,
      description: job.description?.slice(0, 120) ?? undefined,
      url: `https://akilibrain.com/jobs/${job.id}`,
    }))
  );

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: 'https://akilibrain.com' },
    { name: 'Jobs & Careers', url: 'https://akilibrain.com/jobs' },
  ]);

  return (
    <>
      {data.length > 0 && <JsonLd schema={itemListSchema} />}
      <JsonLd schema={breadcrumbSchema} />
      
      {totalCount > 0 && (
        <div className="flex justify-center -mt-4 mb-8">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-white/70">
            Showing <span className="text-white mx-1">{data.length}</span> of <span className="text-white mx-1">{totalCount}</span> active positions
          </div>
        </div>
      )}

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center border border-white/10 rounded-xl bg-white/5 border-dashed">
          <EmptyStateLottie />
          <h3 className="text-xl font-semibold mb-2">No active jobs found</h3>
          <p className="text-muted-foreground max-w-md">
            We couldn&apos;t find any active job postings matching your criteria. Try adjusting your filters or check back later.
          </p>
          {hasFilters && (
            <Link
              href="/jobs"
              className={buttonVariants({ variant: 'outline', className: 'mt-6' })}
            >
              Clear all filters
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end mb-2">
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-lg">
              <Link
                href={`/jobs?${new URLSearchParams({ ...(q ? { q } : {}), ...(company ? { company } : {}), ...(country ? { country } : {}), ...(time ? { time } : {}), ...(type ? { type } : {}), layout: 'grid' }).toString()}`}
                className={`p-1.5 rounded-md transition-colors ${layout === 'grid' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </Link>
              <Link
                href={`/jobs?${new URLSearchParams({ ...(q ? { q } : {}), ...(company ? { company } : {}), ...(country ? { country } : {}), ...(time ? { time } : {}), ...(type ? { type } : {}), layout: 'list' }).toString()}`}
                className={`p-1.5 rounded-md transition-colors ${layout === 'list' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className={layout === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-3"}>
            {data.map(({ job, country, region }, idx) => (
              <React.Fragment key={job.id}>
                <JobCard
                  id={job.id}
                  title={job.title}
                  companyName={job.companyName}
                  description={job.description}
                  requirements={job.requirements}
                  location={region || null}
                  country={country || 'Africa'}
                  jobType={job.jobType ?? 'full_time'}
                  sourceUrl={job.sourceUrl}
                  postedDate={job.postedDate}
                  deadline={job.deadline}
                  createdAt={job.createdAt}
                  layout={layout}
                />
                {idx === 2 && (
                  <div className={layout === 'grid' ? "col-span-1 md:col-span-2 lg:col-span-3" : "w-full"}>
                    <PremiumBanner />
                  </div>
                )}
                {idx === 8 && (
                  <div className={layout === 'grid' ? "col-span-1 md:col-span-2 lg:col-span-3" : "w-full"}>
                    <AdSlot slotId="jobs-feed-1" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {data.length > 0 && (
        <div className="flex items-center justify-center gap-4 pt-6 border-t border-white/5 mt-8">
          {page > 1 && (
            <Link
              href={`/jobs?q=${q || ''}&type=${type || ''}&company=${company || ''}&country=${country || ''}&time=${time || ''}&layout=${layout || 'grid'}&page=${page - 1}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              ← Previous
            </Link>
          )}
          <span className="text-sm text-muted-foreground">Page {page}</span>
          {data.length === PAGE_SIZE && (
            <Link
              href={`/jobs?q=${q || ''}&type=${type || ''}&company=${company || ''}&country=${country || ''}&time=${time || ''}&layout=${layout || 'grid'}&page=${page + 1}`}
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
          <h2 className="text-2xl font-bold text-foreground mb-4">The Ultimate Guide to Finding Jobs in East Africa</h2>
          <p className="leading-relaxed mb-4">
            Navigating the job market in East Africa requires a strategic approach, whether you are seeking employment in Kenya, Tanzania, Uganda, Rwanda, Ethiopia, DRC, or neighboring countries. The region boasts a dynamic and fast-growing economy, with emerging sectors like technology, renewable energy, and digital finance offering abundant opportunities for both seasoned professionals and recent graduates.
          </p>
          <p className="leading-relaxed">
            At AkiliBrain, we aggregate verified job openings from hundreds of employers, NGOs, and government agencies to ensure you never miss an opportunity. Our goal is to connect top talent with leading organizations by providing a transparent and comprehensive job search platform tailored specifically for the East African job market.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-white/10 rounded-xl p-6 bg-white/5">
            <h2 className="text-xl font-semibold text-foreground mb-3">Top Industries Hiring in 2024</h2>
            <ul className="space-y-2 text-sm list-disc list-inside">
              <li><strong>Information Technology (IT):</strong> High demand for software engineers, data analysts, and cybersecurity experts, particularly in tech hubs like Nairobi (Silicon Savannah) and Kigali.</li>
              <li><strong>Financial Services & Fintech:</strong> Roles in mobile money, digital banking, and microfinance are rapidly expanding across the region.</li>
              <li><strong>NGOs & Development:</strong> International organizations frequently hire specialists in public health, agriculture, and project management in Uganda and Tanzania.</li>
              <li><strong>Renewable Energy:</strong> Opportunities in solar power, wind energy, and sustainability consulting are on the rise.</li>
            </ul>
          </div>
          <div className="border border-white/10 rounded-xl p-6 bg-white/5">
            <h2 className="text-xl font-semibold text-foreground mb-3">Tips for Crafting a Winning Application</h2>
            <ul className="space-y-2 text-sm list-disc list-inside">
              <li><strong>Tailor Your CV:</strong> Ensure your resume highlights specific skills and experiences relevant to the job description. Use industry-standard keywords.</li>
              <li><strong>Write a Compelling Cover Letter:</strong> Address the hiring manager directly and explain why you are uniquely qualified for the role.</li>
              <li><strong>Upskill Continuously:</strong> The East African job market is highly competitive. Certifications in tech, finance, or project management can set you apart.</li>
              <li><strong>Network:</strong> Leverage professional networks like LinkedIn and attend industry events in your city to uncover hidden job opportunities.</li>
            </ul>
          </div>
        </div>
        
        <div className="border border-white/10 rounded-xl p-6 bg-white/5">
            <h2 className="text-xl font-semibold text-foreground mb-3">Frequently Asked Questions (FAQ)</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground">Are the jobs on this platform verified?</h3>
                <p className="text-sm mt-1">Yes, we aggregate job postings from reputable employers, official government portals, and trusted NGO career sites to ensure authenticity.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">How often is the job board updated?</h3>
                <p className="text-sm mt-1">Our platform is updated daily with fresh listings, ensuring you have access to the latest opportunities as soon as they become available.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Can I find remote jobs here?</h3>
                <p className="text-sm mt-1">Absolutely. You can use our &quot;Job Type&quot; filter to specifically search for remote roles that allow you to work from anywhere in East Africa or globally.</p>
              </div>
            </div>
        </div>
      </section>
    </>
  );
}
