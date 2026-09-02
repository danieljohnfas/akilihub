import { db, safeQuery } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { countries, regions } from '@/lib/db/schema/shared';
import { eq, or, and, isNull, gt, ilike, ne, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Calendar, Building2, MapPin, ExternalLink, ArrowLeft, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { JobCard } from '@/components/jobs/JobCard';

import { AutoLinker } from '@/components/seo/AutoLinker';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildJobPostingSchema, buildBreadcrumbSchema } from '@/components/seo/schemas';
import { getSourceProvenance } from '@/lib/utils/provenance';
import { isAggregatorUrl } from '@/lib/sources/aggregators';
import type { Metadata } from 'next';

// ISR: revalidate every hour. Avoids Googlebot seeing inconsistent content
// across multiple crawls (which triggers "Google chose different canonical").
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const data = await safeQuery(
    db
      .select({
        title: jobs.title,
        companyName: jobs.companyName,
        description: jobs.description,
        region: regions.name,
        country: countries.name,
        createdAt: jobs.createdAt,
        isActive: jobs.isActive,
        deadline: jobs.deadline,
      })
      .from(jobs)
      .leftJoin(countries, eq(jobs.countryId, countries.id))
      .leftJoin(regions, eq(jobs.regionId, regions.id))
      .where(eq(jobs.id, resolvedParams.id))
      .limit(1)
  );

  if (!data.length) {
    return { 
      title: 'Job Not Found',
      robots: { index: false, follow: false }
    };
  }

  const job = data[0];
  const companyStr = (!job.companyName || job.companyName.toLowerCase() === 'unknown') ? '' : ` at ${job.companyName}`;
  const title = `${job.title}${companyStr} | Jobs`;
  const desc = job.description 
    ? (job.description.slice(0, 150) + (job.description.length > 150 ? '...' : ''))
    : `Apply for the ${job.title} position${companyStr} in ${job.region || job.country || 'East Africa'}.`;

  const url = `https://akilibrain.com/jobs/${resolvedParams.id}`;

  // A job is expired if its deadline has passed OR it was deactivated.
  const isExpired = job.deadline ? job.deadline < new Date() : !job.isActive;

  return {
    title,
    description: desc,
    keywords: [job.title, job.companyName, job.region || '', job.country || '', 'job vacancy', 'career'].filter(Boolean),
    openGraph: {
      title,
      description: desc,
      url,
      type: 'article',
      publishedTime: job.createdAt.toISOString(),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
    },
    alternates: {
      canonical: url,
    },
    // Expired/closed jobs should not be indexed: their content is a dead end
    // and Google's "duplicate canonical" signal is often triggered by the
    // content changing after a job closes. noindex resolves that immediately.
    ...(isExpired && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}

const jobTypeLabels: Record<string, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract: 'Contract',
  internship: 'Internship',
  remote: 'Remote',
};

const jobTypeColors: Record<string, string> = {
  full_time: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  part_time: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  contract: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  internship: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  remote: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

export async function JobDetail({
  id,
}: {
  id: string;
}) {
  const data = await safeQuery(db
    .select({
      job: jobs,
      country: countries.name,
      countryCode: countries.code,
      region: regions.name,
    })
    .from(jobs)
    .leftJoin(countries, eq(jobs.countryId, countries.id))
    .leftJoin(regions, eq(jobs.regionId, regions.id))
    .where(eq(jobs.id, id))
    .limit(1));


  if (!data.length) {
    notFound();
  }

  const { job, country, countryCode, region } = data[0];

  const isExpired = job.deadline ? job.deadline < new Date() : !job.isActive;
  const typeColor = jobTypeColors[job.jobType || 'full_time'] || jobTypeColors['full_time'];
  const typeLabel = jobTypeLabels[job.jobType || 'full_time'] || 'Full Time';
  const targetUrl = job.employerUrl ?? job.sourceUrl;
  const provenance = getSourceProvenance(targetUrl, 'job');

  // Query similar active jobs
  const activeCondition = and(
    eq(jobs.isActive, true),
    or(isNull(jobs.deadline), gt(jobs.deadline, new Date())),
    ne(jobs.id, id)
  );
  
  const similarCondition = and(
    activeCondition,
    job.countryId ? eq(jobs.countryId, job.countryId) : undefined,
    job.profession ? ilike(jobs.profession, job.profession) : (
      job.sector ? eq(jobs.sector, job.sector) : ilike(jobs.title, `%${job.title.split(' ')[0]}%`)
    )
  );

  const similarJobsRes = await safeQuery(
    db.select({
      job: jobs,
      country: countries.name,
      region: regions.name,
    })
    .from(jobs)
    .leftJoin(countries, eq(jobs.countryId, countries.id))
    .leftJoin(regions, eq(jobs.regionId, regions.id))
    .where(similarCondition)
    .orderBy(desc(jobs.createdAt))
    .limit(isExpired ? 6 : 3)
  );

  return (
    <div className="container py-8 max-w-4xl mx-auto space-y-8">
      {/* JSON-LD Schemas */}
      <JsonLd schema={buildJobPostingSchema({
        id: job.id,
        title: job.title,
        companyName: job.companyName,
        description: job.description,
        location: region,
        country,
        countryCode,
        jobType: job.jobType,
        postedDate: job.postedDate,
        deadline: job.deadline,
        sourceUrl: (job.employerUrl && !isAggregatorUrl(job.employerUrl)) ? job.employerUrl : `https://akilibrain.com/jobs/${job.id}`,
        salaryMin: job.salaryMin ? parseFloat(job.salaryMin) : null,
        salaryMax: job.salaryMax ? parseFloat(job.salaryMax) : null,
        salaryCurrency: job.salaryCurrency,
        sector: job.sector,
        skills: job.skills,
        experienceLevel: job.experienceLevel,
        educationLevel: job.educationLevel,
      })} />


      <JsonLd schema={buildBreadcrumbSchema([
        { name: 'Home', url: 'https://akilibrain.com' },
        { name: 'Jobs & Careers', url: 'https://akilibrain.com/jobs' },
        { name: `${job.title} at ${job.companyName}`, url: `https://akilibrain.com/jobs/${job.id}` },
      ])} />

      {/* Back Button */}
      <Link href="/jobs" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Jobs
      </Link>

      {/* Header */}
      <div className="space-y-4">
        {isExpired && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-destructive mb-2">This position has closed.</h2>
            <p className="text-destructive/80 mb-4">
              The application deadline for this role has passed or the employer has stopped accepting applications. 
              Don't worry—we've found {similarJobsRes.length} similar active jobs for you below!
            </p>
            <div className="flex gap-4">
              <a href="#similar-jobs" className={buttonVariants({ variant: "destructive" })}>
                View Similar Active Jobs ↓
              </a>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className={`text-xs border ${provenance.badgeClassName}`}>
            {provenance.badgeLabel}
          </Badge>
          <Badge variant="outline" className={`border ${typeColor}`}>
            {typeLabel}
          </Badge>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-tight">
          {job.title}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-8">
          <section className="space-y-4 bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              Job Description
            </h2>
            <div className="prose prose-invert max-w-none text-muted-foreground">
              {job.description && job.description !== 'null' && job.description.trim() !== '' ? (
                <AutoLinker text={job.description} className="whitespace-pre-wrap" />
              ) : (
                <p className="italic">No detailed description provided.</p>
              )}
            </div>
          </section>

          {job.requirements && job.requirements !== 'null' && job.requirements.trim() !== '' && (
            <section className="space-y-4 bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                Requirements
              </h2>
              <div className="prose prose-invert max-w-none text-muted-foreground">
                <AutoLinker text={job.requirements} className="whitespace-pre-wrap" />
              </div>
            </section>
          )}

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {job.postedDate && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-center">
                <p className="text-sm text-muted-foreground mb-1">Posted</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  {format(job.postedDate, 'PPP')}
                </p>
              </div>
            )}

          </section>

          {/* Editorial Context — Google AdSense content quality requirement */}
          <section className="space-y-3 bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-foreground">About This Listing</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This job listing was sourced by AkiliBrain&apos;s automated data pipeline from a publicly
              accessible employer career page or job board. Listings are indexed daily and verified against
              the original source. AkiliBrain does not charge employers for listing and does not endorse
              any specific employer or role.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              To apply, use the official link provided by the employer. If you believe this listing
              contains inaccurate information, please{' '}
              <a
                href="mailto:corrections@akilibrain.com"
                className="text-primary hover:underline underline-offset-4"
              >
                contact our editorial team
              </a>.
            </p>
            <p className="text-xs text-muted-foreground/60 pt-1">
              Source: AkiliBrain Jobs &amp; Careers Intelligence — updated daily from employer portals across East Africa.
            </p>
          </section>

          {/* Similar Jobs (Below main content) */}
          <section id="similar-jobs" className="mt-12 space-y-6 border-t border-white/10 pt-8">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              Similar {job.profession ? job.profession : 'Active'} Jobs {country ? `in ${country}` : ''}
            </h2>
            {similarJobsRes.length > 0 ? (
              <div className="flex flex-col gap-4">
                {similarJobsRes.map((sj) => (
                  <JobCard
                    key={sj.job.id}
                    id={sj.job.id}
                    title={sj.job.title}
                    companyName={sj.job.companyName}
                    description={sj.job.description}
                    requirements={sj.job.requirements}
                    location={sj.region || null}
                    country={sj.country || 'Africa'}
                    jobType={sj.job.jobType ?? 'full_time'}
                    sourceUrl={sj.job.sourceUrl}
                    postedDate={sj.job.postedDate}
                    deadline={sj.job.deadline}
                    createdAt={sj.job.createdAt}
                    layout="list"
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No similar active jobs found at the moment.</p>
            )}
            
            {/* Related Searches */}
            <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">People who viewed this also searched for:</h3>
              <div className="flex flex-wrap gap-2">
                {job.profession && (
                  <Link href={`/jobs/${countryCode?.toLowerCase() || 'africa'}/${job.profession.toLowerCase().replace(/ /g, '-')}`} className="text-sm text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-full">
                    {job.profession} Jobs in {country || 'East Africa'}
                  </Link>
                )}
                {job.sector && (
                  <Link href={`/jobs/${countryCode?.toLowerCase() || 'africa'}/${job.sector.toLowerCase().replace(/ /g, '-')}`} className="text-sm text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-full">
                    {job.sector} Sector Jobs
                  </Link>
                )}
                {(region || country) && (
                  <Link href={`/jobs/${countryCode?.toLowerCase() || 'africa'}/${(region || country)!.toLowerCase().replace(/ /g, '-')}`} className="text-sm text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-full">
                    Jobs in {region || country || 'East Africa'}
                  </Link>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-card border border-white/10 rounded-xl p-6 space-y-6 sticky top-24">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Company</p>
              <p className="font-medium flex items-start gap-2">
                <Building2 className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                <span>{job.companyName}</span>
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0 text-primary" />
                <span>{region ? `${country} • ${region}` : country || 'Unknown'}</span>
              </p>
            </div>

            {job.deadline && (
              <div className="space-y-1 pt-4 border-t border-white/10">
                <p className="text-sm text-muted-foreground">Deadline</p>
                <p className={`font-semibold flex items-center gap-2 text-lg ${isExpired ? 'text-destructive/80' : 'text-amber-400'}`}>
                  <Calendar className="w-5 h-5 shrink-0" />
                  {format(job.deadline, 'PPP')}
                </p>
                <p className="text-xs text-muted-foreground pl-7">
                  {formatDistanceToNow(job.deadline, { addSuffix: true })}
                </p>
              </div>
            )}

            <div className="pt-6 space-y-3">
              {isExpired && (
                <div className="w-full text-center py-2 text-sm font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  Expired / Closed
                </div>
              )}
              {job.employerUrl && !isAggregatorUrl(job.employerUrl) ? (
                <a 
                  href={`/api/out?url=${encodeURIComponent(job.employerUrl)}&type=job&id=${job.id}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ size: "lg", variant: "outline", className: "w-full md:w-auto h-12 px-8 text-base font-semibold" }))}
                >
                  Apply on Employer Site
                  <ExternalLink className="w-5 h-5 ml-2" />
                </a>
              ) : (
                <div className="w-full md:w-auto h-12 px-4 flex items-center justify-center text-sm font-medium text-amber-600 border border-amber-200 bg-amber-50 rounded-md">
                  Direct employer link pending resolution
                </div>
              )}
              <Link 
                href={`/jobs/apply/${job.id}`}
                className={cn(buttonVariants({ size: "lg", className: "w-full md:w-auto h-12 px-8 text-base font-semibold shadow-lg shadow-primary/20" }))}
              >
                Apply with AI Assistant
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
