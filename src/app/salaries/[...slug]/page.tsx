import { db, safeQuery } from '@/lib/db/client';
import { salarySubmissions, employers } from '@/lib/db/schema/salaries';
import { countries } from '@/lib/db/schema/shared';
import { eq, desc, ilike, and, count } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { SalaryCard } from '@/components/salaries/SalaryCard';
import { JobCard } from '@/components/jobs/JobCard';
import { jobs } from '@/lib/db/schema/jobs';
import { regions } from '@/lib/db/schema/shared';
import { buildSalaryListSchema, buildBreadcrumbSchema } from '@/components/seo/schemas';
import { JsonLd } from '@/components/seo/JsonLd';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import React from 'react';
import { PremiumBanner } from '@/components/shared/PremiumBanner';
import { AdSlot } from '@/components/shared/AdSlot';
import { isNull, gt, or } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function toTitleCase(str: string) {
  return str.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const slugArray = resolvedParams.slug;
  
  let countryName = '';
  let roleName = '';

  if (slugArray.length === 1) {
    const slug = slugArray[0];
    if (['tanzania', 'kenya', 'uganda', 'rwanda', 'ethiopia', 'somalia', 'burundi', 'south-sudan', 'djibouti'].includes(slug.toLowerCase())) {
      countryName = toTitleCase(slug);
    } else {
      roleName = toTitleCase(slug);
    }
  } else if (slugArray.length === 2) {
    roleName = toTitleCase(slugArray[0]);
    countryName = toTitleCase(slugArray[1]);
  }

  const currentYear = new Date().getFullYear();
  const title = `${roleName ? roleName + ' ' : ''}Salary in ${countryName || 'East Africa'} ${currentYear}`;
  
  return {
    title,
    description: `Discover the average ${roleName ? roleName.toLowerCase() + ' ' : ''}salary in ${countryName || 'East Africa'} for ${currentYear}. Compare pay by experience level and explore active job openings.`,
    openGraph: { title, type: 'website' },
    alternates: { canonical: `https://akilibrain.com/salaries/${slugArray.join('/')}` },
  };
}

export default async function SalarySlugRoute({
  params,
  searchParams: rawParams,
}: {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const searchParams = await rawParams;
  const slugArray = resolvedParams.slug;

  let countryName = '';
  let roleName = '';

  if (slugArray.length === 1) {
    const slug = slugArray[0];
    if (['tanzania', 'kenya', 'uganda', 'rwanda', 'ethiopia', 'somalia', 'burundi', 'south-sudan', 'djibouti'].includes(slug.toLowerCase())) {
      countryName = toTitleCase(slug);
    } else {
      roleName = toTitleCase(slug);
    }
  } else if (slugArray.length === 2) {
    roleName = toTitleCase(slugArray[0]);
    countryName = toTitleCase(slugArray[1]);
  } else {
    notFound();
  }

  const currentYear = new Date().getFullYear();
  const PAGE_SIZE = 30;
  const pageStr = Array.isArray(searchParams?.page) ? searchParams.page[0] : searchParams?.page;
  const page = parseInt(pageStr || '1', 10) || 1;
  const offset = (page - 1) * PAGE_SIZE;

  let countryId: string | undefined;
  if (countryName) {
    const cRes = await safeQuery(db.select({ id: countries.id }).from(countries).where(ilike(countries.name, countryName)).limit(1));
    if (cRes.length > 0) countryId = cRes[0].id;
  }

  const conditions = [
    countryId ? eq(salarySubmissions.countryId, countryId) : undefined,
    roleName ? ilike(salarySubmissions.jobTitle, `%${roleName.replace(/salary|salaries/i, '').trim()}%`) : undefined
  ].filter(Boolean);

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const activeCondition = and(
    eq(jobs.isActive, true),
    eq(jobs.isAggregatorSource, false),
    or(isNull(jobs.deadline), gt(jobs.deadline, new Date()))
  );

  const jobConditions = [
    activeCondition,
    countryId ? eq(jobs.countryId, countryId) : undefined,
    roleName ? ilike(jobs.title, `%${roleName.replace(/salary|salaries/i, '').trim()}%`) : undefined
  ].filter(Boolean);

  const [totalCountResult, data, relatedJobs] = await Promise.all([
    safeQuery(db.select({ value: count() }).from(salarySubmissions).where(whereClause)),
    safeQuery(
      db
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
        .offset(offset)
    ),
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
        .where(jobConditions.length > 0 ? and(...jobConditions) : undefined)
        .orderBy(desc(jobs.createdAt))
        .limit(3)
    )
  ]);

  const totalCount = totalCountResult?.[0]?.value || 0;
  const titleStr = `${roleName ? roleName + ' ' : ''}Salary in ${countryName || 'East Africa'} ${currentYear}`;

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
    { name: 'Salaries', url: 'https://akilibrain.com/salaries' },
    { name: titleStr, url: `https://akilibrain.com/salaries/${slugArray.join('/')}` },
  ]);

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8">
      {data.length > 0 && <JsonLd schema={salarySchema} />}
      <JsonLd schema={breadcrumbSchema} />
      
      <div className="flex flex-col items-center text-center gap-6 border-b border-white/5 pb-10 mb-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{titleStr}</h1>
        <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
          Based on {totalCount > 0 ? totalCount : 'recent'} crowdsourced and verified salary submissions.
        </p>
        <Link href={`/jobs?q=${encodeURIComponent(roleName || '')}&country=${encodeURIComponent(countryName || '')}`} className={buttonVariants({ size: "lg", className: "rounded-full shadow-lg shadow-primary/20" })}>
          View Active {roleName || 'Job'} Roles in {countryName || 'East Africa'}
        </Link>
      </div>

      {data.length > 0 ? (
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
      ) : (
        <div className="text-center py-20">
          <h3 className="text-xl font-semibold mb-2">No salary data found</h3>
          <p className="text-muted-foreground">We don&apos;t have any reported salaries for this specific role and location yet.</p>
        </div>
      )}
      
      <section className="mt-16 space-y-8 text-muted-foreground border-t border-white/5 pt-12">
        <div className="border border-white/10 rounded-xl p-6 bg-white/5">
          <h2 className="text-2xl font-bold text-foreground mb-4">Negotiating Your {roleName} Salary</h2>
          <p className="leading-relaxed mb-4">
            Understanding the market rate for {roleName ? roleName.toLowerCase() + 's' : 'roles'} in {countryName || 'East Africa'} is crucial when negotiating an offer.
            Factors such as experience level, company size (NGOs vs Banking vs Startups), and location (e.g. Dar es Salaam vs Arusha) heavily influence the final compensation package.
          </p>
        </div>
      </section>

      {relatedJobs && relatedJobs.length > 0 && (
        <section className="mt-8 space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Current {roleName || 'Job'} Roles in {countryName || 'East Africa'}</h2>
          <div className="flex flex-col gap-3">
            {relatedJobs.map(({ job, country, region }) => (
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
          <div className="text-center pt-4">
            <Link href={`/jobs?q=${encodeURIComponent(roleName || '')}&country=${encodeURIComponent(countryName || '')}`} className={buttonVariants({ variant: "outline", className: "rounded-full px-8" })}>
              View all active {roleName} jobs →
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
