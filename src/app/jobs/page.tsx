import { db, safeQuery } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { countries } from '@/lib/db/schema/shared';
import { eq, desc, ilike, and, or, isNull, gt } from 'drizzle-orm';
import { JobCard } from '@/components/jobs/JobCard';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Search, Inbox, Briefcase, Building2, MapPin, Filter } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Jobs & Careers in East Africa | AkiliBrain',
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
    title: 'Jobs & Careers in East Africa | AkiliBrain',
    description:
      'Discover thousands of active job openings across Kenya, Tanzania, Uganda, and Rwanda. Updated daily from across the web.',
    url: 'https://akilibrain.com/jobs',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jobs & Careers in East Africa | AkiliBrain',
    description: 'Discover thousands of active job openings across East Africa. Updated daily.',
  },
  alternates: {
    canonical: 'https://akilibrain.com/jobs',
  },
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; company?: string; location?: string }>;
}) {
  const params = await searchParams;
  const q = params.q || '';
  const type = params.type || '';
  const company = params.company || '';
  const location = params.location || '';

  const activeCondition = and(
    eq(jobs.isActive, true),
    or(isNull(jobs.deadline), gt(jobs.deadline, new Date()))
  );

  const conditions = [
    activeCondition,
    q ? ilike(jobs.title, `%${q}%`) : undefined,
    type ? eq(jobs.jobType, type as never) : undefined,
    company ? eq(jobs.companyName, company) : undefined,
    location ? eq(jobs.location, location) : undefined,
  ].filter(Boolean);

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

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
      .limit(30)
  );

  // Fetch unique companies and locations for the dropdowns
  const uniqueCompaniesData = await safeQuery(
    db.selectDistinct({ name: jobs.companyName }).from(jobs).where(activeCondition)
  );
  const uniqueLocationsData = await safeQuery(
    db.selectDistinct({ name: jobs.location }).from(jobs).where(activeCondition)
  );

  const uniqueCompanies = uniqueCompaniesData.map(c => c.name).filter((c): c is string => Boolean(c)).sort();
  const uniqueLocations = uniqueLocationsData.map(l => l.name).filter((l): l is string => Boolean(l)).sort();

  const jobTypes = [
    { value: '', label: 'All Types' },
    { value: 'full_time', label: 'Full Time' },
    { value: 'part_time', label: 'Part Time' },
    { value: 'contract', label: 'Contract' },
    { value: 'internship', label: 'Internship' },
    { value: 'remote', label: 'Remote' },
  ];

  const hasFilters = q || type || company || location;

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Jobs & Careers</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Discover active job opportunities across East Africa, automatically sourced from across the web.
          </p>
          {data.length > 0 && (
            <p className="text-sm text-white/40">
              Showing <span className="text-white/70 font-medium">{data.length}</span> active positions
            </p>
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
              <select
                name="company"
                defaultValue={company}
                className="flex h-10 w-full items-center justify-between rounded-md border border-white/10 bg-black/20 pl-9 pr-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 appearance-none text-foreground"
              >
                <option value="">All Companies</option>
                {uniqueCompanies.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5 flex-1 w-full">
            <label className="text-xs text-muted-foreground font-medium pl-1">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <select
                name="location"
                defaultValue={location}
                className="flex h-10 w-full items-center justify-between rounded-md border border-white/10 bg-black/20 pl-9 pr-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 appearance-none text-foreground"
              >
                <option value="">All Locations</option>
                {uniqueLocations.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
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
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Inbox className="w-8 h-8 text-muted-foreground" />
          </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map(({ job, country }) => (
            <JobCard
              key={job.id}
              id={job.id}
              title={job.title}
              companyName={job.companyName}
              description={job.description}
              location={job.location}
              country={country || 'Africa'}
              jobType={job.jobType ?? 'full_time'}
              sourceUrl={job.sourceUrl}
              postedDate={job.postedDate}
              deadline={job.deadline}
            />
          ))}
        </div>
      )}
    </div>
  );
}
