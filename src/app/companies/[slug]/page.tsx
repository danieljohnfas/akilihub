import { db, safeQuery } from '@/lib/db/client';
import { tenders } from '@/lib/db/schema/tenders';
import { jobs } from '@/lib/db/schema/jobs';
import { salarySubmissions, employers } from '@/lib/db/schema/salaries';
import { countries } from '@/lib/db/schema/shared';
import { eq, desc, ilike } from 'drizzle-orm';
import { TenderCard } from '@/components/tenders/TenderCard';
import { JobCard } from '@/components/jobs/JobCard';
import { SalaryCard } from '@/components/salaries/SalaryCard';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Building2, MapPin, Search, Briefcase } from 'lucide-react';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbSchema } from '@/components/seo/schemas';
import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const decodedName = decodeURIComponent(slug).replace(/-/g, ' ');
  const capitalizedName = decodedName.replace(/\b\w/g, l => l.toUpperCase());
  
  return {
    title: `${capitalizedName} - Jobs, Tenders & Salaries | AkiliBrain`,
    description: `Explore available jobs, government tenders, contracts, and crowdsourced salary data for ${capitalizedName}.`,
  };
}

export default async function CompanyPage({ params }: Props) {
  const { slug } = await params;
  const decodedName = decodeURIComponent(slug).replace(/-/g, ' ');
  
  // We don't have a strict unified company table, so we do text matching across the 3 domains.
  const searchTerm = `%${decodedName}%`;

  // Fetch Jobs
  const companyJobs = await safeQuery(
    db.select({
      job: jobs,
      country: countries.name
    })
    .from(jobs)
    .leftJoin(countries, eq(jobs.countryId, countries.id))
    .where(ilike(jobs.companyName, searchTerm))
    .orderBy(desc(jobs.postedDate))
    .limit(10)
  );

  // Fetch Tenders
  const companyTenders = await safeQuery(
    db.select({
      tender: tenders,
      country: countries.name
    })
    .from(tenders)
    .leftJoin(countries, eq(tenders.countryId, countries.id))
    .where(ilike(tenders.contractingAuthority, searchTerm))
    .orderBy(desc(tenders.publishedAt))
    .limit(10)
  );

  // Fetch Salaries
  const companySalaries = await safeQuery(
    db.select({
      salary: salarySubmissions,
      employer: employers,
      country: countries.name
    })
    .from(salarySubmissions)
    .innerJoin(employers, eq(salarySubmissions.employerId, employers.id))
    .leftJoin(countries, eq(salarySubmissions.countryId, countries.id))
    .where(ilike(employers.name, searchTerm))
    .orderBy(desc(salarySubmissions.submittedAt))
    .limit(10)
  );

  if (companyJobs.length === 0 && companyTenders.length === 0 && companySalaries.length === 0) {
    return (
      <div className="container py-20 flex flex-col items-center text-center">
        <Building2 className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
        <h1 className="text-2xl font-bold mb-2">Company Not Found</h1>
        <p className="text-muted-foreground max-w-md mb-6">
          We couldn't find any jobs, tenders, or salary data for "{decodedName}".
        </p>
        <Link href="/" className={buttonVariants({ variant: "default" })}>
          Return Home
        </Link>
      </div>
    );
  }

  // Derive an assumed "Company Name" from the first result found to display nice casing
  const displayName = 
    companyJobs[0]?.job.companyName || 
    companyTenders[0]?.tender.contractingAuthority || 
    companySalaries[0]?.employer.name || 
    decodedName;

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: 'https://akilibrain.com' },
    { name: 'Companies', url: 'https://akilibrain.com/companies' },
    { name: displayName, url: `https://akilibrain.com/companies/${slug}` },
  ]);

  return (
    <div className="container py-12 max-w-7xl mx-auto space-y-16">
      <JsonLd schema={breadcrumbSchema} />
      
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-black/40 p-8 md:p-12">
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-transparent to-transparent opacity-50" />
        <div className="relative z-10 flex flex-col md:flex-row items-start gap-8">
          <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <Building2 className="w-10 h-10 text-muted-foreground" />
          </div>
          
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              {displayName}
            </h1>
            <p className="text-lg text-muted-foreground">
              Explore available career opportunities, government contracts, and crowdsourced compensation data for {displayName}.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium">
                <Briefcase className="w-4 h-4 text-blue-400" /> {companyJobs.length} Jobs
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium">
                <Building2 className="w-4 h-4 text-amber-400" /> {companyTenders.length} Tenders
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Jobs Section */}
      {companyJobs.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Jobs & Vacancies</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companyJobs.map(({ job, country }) => (
              <JobCard
                key={job.id}
                id={job.id}
                title={job.title}
                companyName={job.companyName}
                description={job.description}
                requirements={job.requirements}
                location={job.location}
                country={country || 'Unknown'}
                jobType={job.jobType ?? 'full_time'}
                sourceUrl={job.sourceUrl}
                postedDate={job.postedDate}
                deadline={job.deadline}
                layout="grid"
              />
            ))}
          </div>
        </section>
      )}

      {/* Tenders Section */}
      {companyTenders.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Tenders & Contracts</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companyTenders.map(({ tender, country }) => (
              <TenderCard
                key={tender.id}
                id={tender.id}
                title={tender.title}
                referenceNo={tender.referenceNo}
                contractingAuthority={tender.contractingAuthority}
                country={country || 'Unknown'}
                sector={tender.sectorId || undefined}
                status={tender.status}
                deadline={tender.deadline}
                budget={tender.budget}
                currency={tender.currency}
                documentUrl={tender.documentUrl}
              />
            ))}
          </div>
        </section>
      )}

      {/* Salaries Section */}
      {companySalaries.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Salary Data</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companySalaries.map(({ salary, employer, country }) => (
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
        </section>
      )}
    </div>
  );
}
