import { db, safeQuery } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { countries } from '@/lib/db/schema/shared';
import { eq, desc, ilike, and } from 'drizzle-orm';
import { JobCard } from '@/components/jobs/JobCard';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Search, SlidersHorizontal, Inbox, Briefcase } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Jobs & Careers | AkiliBrain',
  description: 'Browse the latest job openings and career opportunities across East Africa — Kenya, Tanzania, Uganda, and Rwanda.',
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const params = await searchParams;
  const q = params.q || '';
  const type = params.type || '';

  const conditions = [
    eq(jobs.isActive, true),
    q ? ilike(jobs.title, `%${q}%`) : undefined,
    type ? eq(jobs.jobType, type as never) : undefined,
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

  const jobTypes = [
    { value: '', label: 'All Types' },
    { value: 'full_time', label: 'Full Time' },
    { value: 'part_time', label: 'Part Time' },
    { value: 'contract', label: 'Contract' },
    { value: 'internship', label: 'Internship' },
    { value: 'remote', label: 'Remote' },
  ];

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Jobs & Careers</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Discover job opportunities across East Africa, automatically sourced from across the web.
          </p>
          {data.length > 0 && (
            <p className="text-sm text-white/40">
              Showing <span className="text-white/70 font-medium">{data.length}</span> active positions
            </p>
          )}
        </div>

        <form className="w-full md:w-auto flex items-center gap-2" action="/jobs" method="GET">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              name="q"
              placeholder="Search jobs..."
              className="pl-9 bg-white/5 border-white/10 focus-visible:ring-primary/50"
              defaultValue={q}
            />
            {type && <input type="hidden" name="type" value={type} />}
          </div>
          <Button variant="outline" size="icon" type="submit" className="shrink-0 bg-white/5 border-white/10">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Job Type Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {jobTypes.map(({ value, label }) => (
          <Link
            key={value}
            href={`/jobs?${new URLSearchParams({
              ...(q ? { q } : {}),
              ...(value ? { type: value } : {}),
            }).toString()}`}
          >
            <Button
              variant={type === value || (!type && value === '') ? 'default' : 'secondary'}
              size="sm"
              className="rounded-full whitespace-nowrap"
            >
              {label}
            </Button>
          </Link>
        ))}
      </div>

      {/* Grid */}
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center border border-white/10 rounded-xl bg-white/5 border-dashed">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Inbox className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No jobs found</h3>
          <p className="text-muted-foreground max-w-md">
            We couldn&apos;t find any jobs matching your search. Try adjusting your filters or check back later as new positions are added daily.
          </p>
          {(q || type) && (
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
