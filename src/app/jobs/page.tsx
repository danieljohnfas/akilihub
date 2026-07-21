import { db, safeQuery } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { countries } from '@/lib/db/schema/shared';
import { eq, desc, ilike, and, or, isNull, gt, count } from 'drizzle-orm';
import { JobCard } from '@/components/jobs/JobCard';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Inbox, Briefcase, Building2, MapPin, Filter, Clock, LayoutGrid, List } from 'lucide-react';
import Link from 'next/link';
import { EmptyStateLottie } from '@/components/ui/empty-state-lottie';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildItemListSchema, buildBreadcrumbSchema } from '@/components/seo/schemas';
import { RelatedGuides } from '@/components/guides/RelatedGuides';

export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Jobs & Careers in East Africa',
  description:
    'Browse thousands of job openings and career opportunities across East Africa — Kenya, Tanzania, Uganda, and Rwanda. Full-time, part-time, remote, and internship roles updated daily.',
  keywords: [
    'jobs Kenya',
    'careers East Africa',
    'job vacancies Kenya 2024',
    'jobs Tanzania',
    'jobs Uganda',
    'jobs Rwanda',
    'remote jobs Africa',
    'internships East Africa',
    'graduate jobs Kenya',
    'job board Africa',
  ],
  openGraph: {
    title: 'Jobs & Careers in East Africa',
    description:
      'Discover thousands of active job openings across Kenya, Tanzania, Uganda, and Rwanda. Updated daily from across the web.',
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

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; company?: string; location?: string; time?: string; layout?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q || '';
  const type = params.type === 'all' ? '' : (params.type || '');
  const company = params.company === 'all' ? '' : (params.company || '');
  const location = params.location === 'all' ? '' : (params.location || '');
  const time = params.time === 'all' ? '' : (params.time || '');
  const layout = params.layout === 'list' ? 'list' : 'grid';
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  const activeCondition = and(
    eq(jobs.isActive, true),
    or(isNull(jobs.deadline), gt(jobs.deadline, new Date()))
  );

  const conditions = [
    activeCondition,
    q ? ilike(jobs.title, `%${q}%`) : undefined,
    type ? eq(jobs.jobType, type as never) : undefined,
    company ? eq(jobs.companyName, company) : undefined,
    location ? (location.startsWith('country:') ? eq(countries.name, location.replace('country:', '')) : eq(jobs.location, location)) : undefined,
    time === '7d' ? gt(jobs.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) : undefined,
    time === '30d' ? gt(jobs.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) : undefined,
    time === '90d' ? gt(jobs.createdAt, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) : undefined,
  ].filter(Boolean);

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const totalCountResult = await safeQuery(
    db.select({ value: count() }).from(jobs).leftJoin(countries, eq(jobs.countryId, countries.id)).where(whereClause)
  );
  const totalCount = totalCountResult?.[0]?.value || 0;

  const data = await safeQuery(
    db
      .select({
        job: jobs,
        country: countries.name,
      })
      .from(jobs)
      .leftJoin(countries, eq(jobs.countryId, countries.id))
      .where(whereClause)
      .orderBy(desc(jobs.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset)
  );

  // Fetch unique companies and locations for the dropdowns
  const uniqueCompaniesData = await safeQuery(
    db.selectDistinct({ name: jobs.companyName }).from(jobs).where(activeCondition)
  );
  const uniqueLocationsData = await safeQuery(
    db.selectDistinct({ name: jobs.location, country: countries.name })
      .from(jobs)
      .leftJoin(countries, eq(jobs.countryId, countries.id))
      .where(activeCondition)
  );

  const uniqueCompanies = uniqueCompaniesData.map(c => c.name).filter((c): c is string => Boolean(c)).sort();
  
  const locationsByCountry = uniqueLocationsData.reduce((acc, curr) => {
    if (!curr.name) return acc;
    const country = curr.country || 'Other';
    if (!acc[country]) acc[country] = [];
    acc[country].push(curr.name);
    return acc;
  }, {} as Record<string, string[]>);
  
  for (const country in locationsByCountry) {
    locationsByCountry[country].sort();
  }
  const sortedCountries = Object.keys(locationsByCountry).sort();

  const jobTypes = [
    { value: '', label: 'All Types' },
    { value: 'full_time', label: 'Full Time' },
    { value: 'part_time', label: 'Part Time' },
    { value: 'contract', label: 'Contract' },
    { value: 'internship', label: 'Internship' },
    { value: 'remote', label: 'Remote' },
  ];

  const hasFilters = q || type || company || location;

  const itemListSchema = buildItemListSchema(
    'Jobs & Careers in East Africa',
    'Active job openings across Kenya, Tanzania, Uganda, and Rwanda.',
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
    <div className="container py-8 max-w-7xl mx-auto space-y-8">
      {data.length > 0 && <JsonLd schema={itemListSchema} />}
      <JsonLd schema={breadcrumbSchema} />
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
          {totalCount > 0 && (
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-white/70 mt-2">
              Showing <span className="text-white mx-1">{data.length}</span> of <span className="text-white mx-1">{totalCount}</span> active positions
            </div>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-white/5 mb-4">
          <Filter className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Filter & Search</h2>
        </div>
        
        <form className="flex flex-col md:flex-row gap-4 items-end" action="/jobs" method="GET">
          {type && <input type="hidden" name="type" value={type} />}
          {layout === 'list' && <input type="hidden" name="layout" value="list" />}
          
          <div className="space-y-1.5 flex-1 w-full">
            <label className="text-xs text-muted-foreground font-medium pl-1">Job Title / Keyword</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="q"
                placeholder="Software engineer..."
                className="pl-9 bg-black/20 border-white/10 focus-visible:ring-primary/50"
                defaultValue={q}
              />
            </div>
          </div>

          <div className="space-y-1.5 flex-1 w-full">
            <label className="text-xs text-muted-foreground font-medium pl-1">Who is recruiting?</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Select name="company" defaultValue={company || 'all'}>
                <SelectTrigger className="w-full h-10 bg-black/20 border-white/10 pl-9">
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {uniqueCompanies.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5 flex-1 w-full">
            <label className="text-xs text-muted-foreground font-medium pl-1">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Select name="location" defaultValue={location || 'all'}>
                <SelectTrigger className="w-full h-10 bg-black/20 border-white/10 pl-9">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {sortedCountries.map(country => (
                    <SelectGroup key={country}>
                      <SelectLabel className="text-white font-semibold">{country}</SelectLabel>
                      <SelectItem value={`country:${country}`} className="text-primary font-medium pl-6">All {country}</SelectItem>
                      {locationsByCountry[country].map(l => (
                        <SelectItem key={l} value={l} className="pl-6">{l}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5 flex-[0.8] w-full">
            <label className="text-xs text-muted-foreground font-medium pl-1">Posted Within</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Select name="time" defaultValue={time || 'all'}>
                <SelectTrigger className="w-full h-10 bg-black/20 border-white/10 pl-9">
                  <SelectValue placeholder="Any time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any time</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full md:w-auto h-10 px-8">
            Filter Results
          </Button>
        </form>

        {/* Job Type Pills inside the filter panel for cohesion */}
        <div className="pt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {jobTypes.map(({ value, label }) => (
            <Link
              key={value}
              href={`/jobs?${new URLSearchParams({
                ...(q ? { q } : {}),
                ...(company ? { company } : {}),
                ...(location ? { location } : {}),
                ...(time ? { time } : {}),
                ...(layout === 'list' ? { layout } : {}),
                ...(value ? { type: value } : {}),
              }).toString()}`}
            >
              <Button
                variant={type === value || (!type && value === '') ? 'default' : 'secondary'}
                size="sm"
                className="rounded-full whitespace-nowrap h-8 text-xs bg-black/20"
              >
                {label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* Grid */}
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
                href={`/jobs?${new URLSearchParams({ ...(q ? { q } : {}), ...(company ? { company } : {}), ...(location ? { location } : {}), ...(time ? { time } : {}), ...(type ? { type } : {}), layout: 'grid' }).toString()}`}
                className={`p-1.5 rounded-md transition-colors ${layout === 'grid' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </Link>
              <Link
                href={`/jobs?${new URLSearchParams({ ...(q ? { q } : {}), ...(company ? { company } : {}), ...(location ? { location } : {}), ...(time ? { time } : {}), ...(type ? { type } : {}), layout: 'list' }).toString()}`}
                className={`p-1.5 rounded-md transition-colors ${layout === 'list' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className={layout === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-3"}>
            {data.map(({ job, country }) => (
              <JobCard
                key={job.id}
              id={job.id}
              title={job.title}
              companyName={job.companyName}
              description={job.description}
              requirements={job.requirements}
              location={job.location}
              country={country || 'Africa'}
              jobType={job.jobType ?? 'full_time'}
              sourceUrl={job.sourceUrl}
              postedDate={job.postedDate}
              deadline={job.deadline}
              layout={layout}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data.length > 0 && (
        <div className="flex items-center justify-center gap-4 pt-6 border-t border-white/5">
          {page > 1 && (
            <Link
              href={`/jobs?q=${q}&type=${type}&company=${company}&location=${location}&time=${time}&layout=${layout}&page=${page - 1}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              ← Previous
            </Link>
          )}
          <span className="text-sm text-muted-foreground">Page {page}</span>
          {data.length === PAGE_SIZE && (
            <Link
              href={`/jobs?q=${q}&type=${type}&company=${company}&location=${location}&time=${time}&layout=${layout}&page=${page + 1}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Next →
            </Link>
          )}
        </div>
      )}

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
