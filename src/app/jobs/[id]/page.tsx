import { db, safeQuery } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { countries } from '@/lib/db/schema/shared';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Calendar, Building2, MapPin, ExternalLink, ArrowLeft, Clock, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

import { JsonLd } from '@/components/seo/JsonLd';
import { buildJobPostingSchema } from '@/components/seo/schemas';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const data = await safeQuery(
    db
      .select({
        title: jobs.title,
        companyName: jobs.companyName,
        description: jobs.description,
        location: jobs.location,
        country: countries.name,
        createdAt: jobs.createdAt,
      })
      .from(jobs)
      .leftJoin(countries, eq(jobs.countryId, countries.id))
      .where(eq(jobs.id, resolvedParams.id))
      .limit(1)
  );

  if (!data.length) return { title: 'Job Not Found' };

  const job = data[0];
  const title = `${job.title} at ${job.companyName} | AkiliBrain Jobs`;
  const desc = job.description 
    ? (job.description.slice(0, 150) + (job.description.length > 150 ? '...' : ''))
    : `Apply for the ${job.title} position at ${job.companyName} in ${job.location || job.country || 'East Africa'}.`;

  const url = `https://akilibrain.com/jobs/${resolvedParams.id}`;

  return {
    title,
    description: desc,
    keywords: [job.title, job.companyName, job.location || '', job.country || '', 'job vacancy', 'career'].filter(Boolean),
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

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  
  const data = await safeQuery(db
    .select({
      job: jobs,
      country: countries.name,
    })
    .from(jobs)
    .leftJoin(countries, eq(jobs.countryId, countries.id))
    .where(eq(jobs.id, resolvedParams.id))
    .limit(1));

  if (!data.length) {
    notFound();
  }

  const { job, country } = data[0];
  const isExpired = job.deadline ? job.deadline < new Date() : !job.isActive;
  const typeColor = jobTypeColors[job.jobType || 'full_time'] || jobTypeColors['full_time'];
  const typeLabel = jobTypeLabels[job.jobType || 'full_time'] || 'Full Time';

  return (
    <div className="container py-8 max-w-4xl mx-auto space-y-8">
      {/* JSON-LD Schema */}
      <JsonLd schema={buildJobPostingSchema({
        id: job.id,
        title: job.title,
        companyName: job.companyName,
        description: job.description,
        location: job.location,
        country,
        jobType: job.jobType,
        postedDate: job.postedDate,
        deadline: job.deadline,
        sourceUrl: job.sourceUrl
      })} />

      {/* Back Button */}
      <Link href="/jobs" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Jobs
      </Link>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className={`border ${typeColor}`}>
            {typeLabel}
          </Badge>
          {isExpired && (
            <Badge variant="secondary" className="bg-destructive/20 text-destructive border-destructive/30">
              Expired / Closed
            </Badge>
          )}
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
                <p className="whitespace-pre-wrap">{job.description}</p>
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
                <p className="whitespace-pre-wrap">{job.requirements}</p>
              </div>
            </section>
          )}

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground mb-1">Posted</p>
              <p className="font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                {job.postedDate ? format(job.postedDate, 'PPP') : 'Recently'}
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground mb-1">Last Crawled</p>
              <p className="font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                {format(job.createdAt, 'PPP')}
              </p>
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
                <span>{(job.location && job.location !== 'null') ? job.location : country || 'Unknown'}</span>
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
              {job.sourceUrl && (
                <a 
                  href={job.sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={buttonVariants({ className: "w-full" })}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Apply / Original Source
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
