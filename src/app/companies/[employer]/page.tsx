import { db, safeQuery } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { countries, regions } from '@/lib/db/schema/shared';
import { eq, desc, ilike, and, or, isNull, gt, count } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { JobCard } from '@/components/jobs/JobCard';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbSchema, buildOrganizationSchema } from '@/components/seo/schemas';
import Link from 'next/link';
import { Building2, MapPin } from 'lucide-react';
import React from 'react';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

function toTitleCase(str: string) {
  return str.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export async function generateMetadata({ params }: { params: Promise<{ employer: string }> }): Promise<Metadata> {
  const { employer } = await params;
  const employerName = toTitleCase(employer);
  const title = `${employerName} Jobs, Careers & Vacancies in East Africa`;
  const description = `Explore current vacancies, past jobs, salaries, and career opportunities at ${employerName} across Kenya, Tanzania, Uganda, and East Africa.`;
  
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    alternates: { canonical: `https://akilibrain.com/companies/${employer}` },
  };
}

export default async function EmployerHub({
  params,
}: {
  params: Promise<{ employer: string }>;
}) {
  const { employer } = await params;
  const employerName = toTitleCase(employer);

  const activeCondition = and(
    eq(jobs.isActive, true),
    or(isNull(jobs.deadline), gt(jobs.deadline, new Date()))
  );
  
  const employerMatch = ilike(jobs.companyName, employerName.replace(/ /g, '%'));

  const [activeJobs, pastJobsResult] = await Promise.all([
    safeQuery(
      db
        .select({
          job: jobs,
          country: countries.name,
          region: regions.name,
        })
        .from(jobs)
        .leftJoin(countries, eq(jobs.countryId, countries.id))
        .leftJoin(regions, eq(jobs.regionId, regions.id))
        .where(and(employerMatch, activeCondition))
        .orderBy(desc(jobs.createdAt))
        .limit(20)
    ),
    safeQuery(
      db
        .select({ value: count() })
        .from(jobs)
        .where(and(employerMatch, eq(jobs.isActive, false)))
    )
  ]);

  const pastJobsCount = pastJobsResult?.[0]?.value || 0;

  if (activeJobs.length === 0 && pastJobsCount === 0) {
    notFound();
  }

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: 'https://akilibrain.com' },
    { name: 'Companies', url: 'https://akilibrain.com/companies' },
    { name: employerName, url: `https://akilibrain.com/companies/${employer}` },
  ]);
  
  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8">
      <JsonLd schema={breadcrumbSchema} />
      
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-8 flex items-start gap-6">
        <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Building2 className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">{employerName} Careers</h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            Welcome to the unofficial employer hub for {employerName}. Browse their current job openings, historical hiring trends, and general salary information in East Africa.
          </p>
          <div className="mt-4 flex gap-4 text-sm font-medium">
            <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full">{activeJobs.length} Active Vacancies</span>
            <span className="bg-white/10 px-3 py-1 rounded-full">{pastJobsCount} Historical Postings</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Current Vacancies at {employerName}</h2>
        
        {activeJobs.length > 0 ? (
          <div className="flex flex-col gap-4">
            {activeJobs.map(({ job, country, region }) => (
              <JobCard
                key={job.id}
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
                layout="list"
              />
            ))}
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
            <p className="text-muted-foreground mb-4">There are currently no active job openings tracked for {employerName}.</p>
            <p className="text-sm">We've recorded {pastJobsCount} past positions. Check back later or set up a job alert.</p>
          </div>
        )}
      </div>
      
      {/* Employer Context / SEO Content */}
      <section className="mt-16 space-y-6 text-muted-foreground border-t border-white/5 pt-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-white/10 rounded-xl p-6 bg-white/5">
            <h2 className="text-xl font-semibold text-foreground mb-3">About {employerName} Jobs</h2>
            <p className="text-sm leading-relaxed">
              AkiliBrain tracks job openings for {employerName} across the entire East African region. 
              By analyzing historical hiring patterns, we can see that they often recruit for roles in various locations. 
              Ensure you tailor your CV directly to their core organizational values and required qualifications.
            </p>
          </div>
          <div className="border border-white/10 rounded-xl p-6 bg-white/5">
            <h2 className="text-xl font-semibold text-foreground mb-3">Salaries & Benefits</h2>
            <p className="text-sm leading-relaxed mb-4">
              Salaries at {employerName} generally follow industry standards for their sector in the region. 
              Multinational entities and large NGOs often provide competitive benefits packages including health insurance, 
              provident funds, and continuous professional development.
            </p>
            <Link href={`/salaries/tanzania/${employer}`} className="text-primary hover:underline text-sm font-medium">
              Check {employerName} salary intelligence →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
