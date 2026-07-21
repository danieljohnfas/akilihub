import { db, safeQuery } from '@/lib/db/client';
import { tenders, tenderSectors } from '@/lib/db/schema/tenders';
import { jobs } from '@/lib/db/schema/jobs';
import { countries, regions } from '@/lib/db/schema/shared';
import { eq, desc, ilike, and, count } from 'drizzle-orm';
import { TenderCard } from '@/components/tenders/TenderCard';
import { JobCard } from '@/components/jobs/JobCard';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, MapPin, Building2, Briefcase } from 'lucide-react';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbSchema } from '@/components/seo/schemas';

import type { Metadata } from 'next';

type Props = {
  params: Promise<{ country: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country } = await params;
  const decodedCountry = decodeURIComponent(country).replace(/-/g, ' ');
  const capitalizedCountry = decodedCountry.charAt(0).toUpperCase() + decodedCountry.slice(1);
  
  return {
    title: `Government Tenders and Jobs in ${capitalizedCountry} | AkiliBrain`,
    description: `Discover the latest government tenders, procurement opportunities, and job vacancies in ${capitalizedCountry}. Updated daily.`,
  };
}

export default async function CountryPage({ params }: Props) {
  const { country } = await params;
  const decodedCountry = decodeURIComponent(country).replace(/-/g, ' ');

  // Fetch country data
  const countryData = await safeQuery(
    db.select().from(countries).where(ilike(countries.name, decodedCountry))
  );

  if (countryData.length === 0) {
    notFound();
  }

  const dbCountry = countryData[0];

  // Fetch recent tenders
  const recentTenders = await safeQuery(
    db.select({
      tender: tenders,
      sector: tenderSectors.name,
    })
    .from(tenders)
    .leftJoin(tenderSectors, eq(tenders.sectorId, tenderSectors.id))
    .where(eq(tenders.countryId, dbCountry.id))
    .orderBy(desc(tenders.publishedAt))
    .limit(6)
  );

  const tendersCountResult = await safeQuery(
    db.select({ value: count() }).from(tenders).where(eq(tenders.countryId, dbCountry.id))
  );
  const tendersCount = tendersCountResult[0]?.value || 0;

  // Fetch recent jobs
  const recentJobs = await safeQuery(
    db.select({
      job: jobs,
      region: regions.name
    })
    .from(jobs)
    .leftJoin(regions, eq(jobs.regionId, regions.id))
    .where(eq(jobs.countryId, dbCountry.id))
    .orderBy(desc(jobs.postedDate))
    .limit(6)
  );
  
  const jobsCountResult = await safeQuery(
    db.select({ value: count() }).from(jobs).where(eq(jobs.countryId, dbCountry.id))
  );
  const jobsCount = jobsCountResult[0]?.value || 0;

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: 'https://akilibrain.com' },
    { name: 'Countries', url: 'https://akilibrain.com/countries' },
    { name: dbCountry.name, url: `https://akilibrain.com/countries/${country}` },
  ]);

  return (
    <div className="container py-12 max-w-7xl mx-auto space-y-16">
      <JsonLd schema={breadcrumbSchema} />
      
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-black/40 p-8 md:p-12 lg:p-16">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              Country Profile
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">
              Opportunities in <span className="text-primary">{dbCountry.name}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Your central hub for all government tenders, public procurement, and career opportunities in {dbCountry.name}.
            </p>
          </div>
          
          <div className="flex flex-col gap-4 min-w-[200px]">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-center">
              <span className="text-4xl font-bold text-white mb-1">{tendersCount.toLocaleString()}</span>
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" /> Tenders & Contracts
              </span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-center">
              <span className="text-4xl font-bold text-white mb-1">{jobsCount.toLocaleString()}</span>
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-400" /> Open Jobs
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tenders Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">Latest Tenders</h2>
            <p className="text-muted-foreground">Recently published procurement notices in {dbCountry.name}.</p>
          </div>
          <Link 
            href={`/tenders?country=${encodeURIComponent(dbCountry.name)}`}
            className={buttonVariants({ variant: "outline", className: "hidden sm:flex" })}
          >
            View All Tenders <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
        
        {recentTenders.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-white/10 bg-white/5 text-muted-foreground">
            No active tenders found for {dbCountry.name} at this time.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentTenders.map(({ tender, sector }) => (
              <TenderCard
                key={tender.id}
                id={tender.id}
                title={tender.title}
                referenceNo={tender.referenceNo}
                contractingAuthority={tender.contractingAuthority}
                country={dbCountry.name}
                sector={sector || undefined}
                status={tender.status}
                deadline={tender.deadline}
                budget={tender.budget}
                currency={tender.currency}
                documentUrl={tender.documentUrl}
              />
            ))}
          </div>
        )}
        
        <div className="sm:hidden mt-4">
          <Link 
            href={`/tenders?country=${encodeURIComponent(dbCountry.name)}`}
            className={buttonVariants({ variant: "outline", className: "w-full" })}
          >
            View All Tenders <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </section>

      {/* Jobs Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">Latest Jobs</h2>
            <p className="text-muted-foreground">Recent career opportunities across various sectors in {dbCountry.name}.</p>
          </div>
          <Link 
            href={`/jobs?country=${encodeURIComponent(dbCountry.name)}`}
            className={buttonVariants({ variant: "outline", className: "hidden sm:flex" })}
          >
            View All Jobs <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
        
        {recentJobs.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-white/10 bg-white/5 text-muted-foreground">
            No active jobs found for {dbCountry.name} at this time.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentJobs.map(({ job, region }) => (
              <JobCard
                key={job.id}
                id={job.id}
                title={job.title}
                companyName={job.companyName}
                description={job.description}
                requirements={job.requirements}
                location={region}
                country={dbCountry.name}
                jobType={job.jobType ?? 'full_time'}
                sourceUrl={job.sourceUrl}
                postedDate={job.postedDate}
                deadline={job.deadline}
                createdAt={job.createdAt}
                layout="grid"
              />
            ))}
          </div>
        )}
        
        <div className="sm:hidden mt-4">
          <Link 
            href={`/jobs?country=${encodeURIComponent(dbCountry.name)}`}
            className={buttonVariants({ variant: "outline", className: "w-full" })}
          >
            View All Jobs <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </section>
    </div>
  );
}
