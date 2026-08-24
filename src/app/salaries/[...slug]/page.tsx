import { db, safeQuery } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { countries, regions } from '@/lib/db/schema/shared';
import { eq, desc, ilike, and, or, isNull, gt, count, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { JobCard } from '@/components/jobs/JobCard';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbSchema } from '@/components/seo/schemas';
import Link from 'next/link';
import { Banknote, TrendingUp, Info } from 'lucide-react';
import React from 'react';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

function toTitleCase(str: string) {
  return str.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const slugArray = resolvedParams.slug;
  
  const COUNTRIES = ['tanzania', 'kenya', 'uganda', 'rwanda', 'ethiopia', 'somalia', 'burundi', 'south-sudan', 'djibouti', 'drc', 'congo'];
  const CITIES = ['dar-es-salaam', 'arusha', 'mwanza', 'nairobi', 'mombasa', 'kampala', 'kigali', 'addis-ababa', 'kinshasa'];
  
  let parsedCountry = '';
  let parsedCity = '';
  let keywordSlugs: string[] = [];

  for (const slug of slugArray) {
    const s = slug.toLowerCase();
    if (COUNTRIES.includes(s)) parsedCountry = s;
    else if (CITIES.includes(s)) parsedCity = s;
    else keywordSlugs.push(slug);
  }

  const countryName = parsedCountry ? toTitleCase(parsedCountry) : '';
  const cityName = parsedCity ? toTitleCase(parsedCity) : '';
  const categoryName = keywordSlugs.map(toTitleCase).join(' ');

  const locParts = [cityName, countryName].filter(Boolean);
  const title = `${categoryName || 'Professional'} Salary in ${locParts.join(', ') || 'East Africa'}`;
  
  return {
    title: `${title} | AkiliBrain Salaries`,
    description: `Discover average salaries, compensation trends, and active high-paying vacancies for ${categoryName || 'professionals'} in ${countryName || 'East Africa'}.`,
    openGraph: { title, type: 'website' },
    alternates: { canonical: 'https://akilibrain.com/salaries/' + slugArray.join('/') },
  };
}

export default async function SalaryHub({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const resolvedParams = await params;
  const slugArray = resolvedParams.slug;
  
  const COUNTRIES = ['tanzania', 'kenya', 'uganda', 'rwanda', 'ethiopia', 'somalia', 'burundi', 'south-sudan', 'djibouti', 'drc', 'congo'];
  const CITIES = ['dar-es-salaam', 'arusha', 'mwanza', 'nairobi', 'mombasa', 'kampala', 'kigali', 'addis-ababa', 'kinshasa'];
  
  let parsedCountry = '';
  let parsedCity = '';
  let keywordSlugs: string[] = [];

  for (const slug of slugArray) {
    const s = slug.toLowerCase();
    if (COUNTRIES.includes(s)) parsedCountry = s;
    else if (CITIES.includes(s)) parsedCity = s;
    else keywordSlugs.push(slug);
  }

  const countryName = parsedCountry ? toTitleCase(parsedCountry) : '';
  const cityName = parsedCity ? toTitleCase(parsedCity) : '';
  const categoryName = keywordSlugs.map(toTitleCase).join(' ');
  const countryCode = parsedCountry.substring(0, 2).toUpperCase(); // Hack for link rendering

  let countryId: string | undefined;
  if (countryName) {
    const cRes = await safeQuery(db.select({ id: countries.id }).from(countries).where(ilike(countries.name, countryName)).limit(1));
    if (cRes.length > 0) countryId = cRes[0].id;
  }
  
  let regionId: string | undefined;
  if (cityName) {
    const rRes = await safeQuery(db.select({ id: regions.id }).from(regions).where(ilike(regions.name, cityName)).limit(1));
    if (rRes.length > 0) regionId = rRes[0].id;
  }

  const conditions = [
    countryId ? eq(jobs.countryId, countryId) : undefined,
    regionId ? eq(jobs.regionId, regionId) : undefined,
    categoryName ? or(
      ilike(jobs.title, '%' + categoryName.replace(/jobs/i, '').trim() + '%'),
      ilike(jobs.profession, '%' + categoryName.replace(/jobs/i, '').trim() + '%')
    ) : undefined,
    isNull(jobs.salaryMin) === false // MUST have salary data
  ].filter(Boolean);

  const whereClause = conditions.length > 0 ? and(...conditions) : isNull(jobs.salaryMin) === false;

  // Aggregate Salary Data
  const salaryAgg = await safeQuery(
    db.select({
      avgMin: sql<number>`AVG(CAST(${jobs.salaryMin} AS NUMERIC))`,
      avgMax: sql<number>`AVG(CAST(${jobs.salaryMax} AS NUMERIC))`,
      count: count(),
      currency: jobs.salaryCurrency
    })
    .from(jobs)
    .where(whereClause)
    .groupBy(jobs.salaryCurrency)
    .orderBy(desc(count()))
    .limit(1)
  );

  const hasSalaryData = salaryAgg && salaryAgg.length > 0 && salaryAgg[0].avgMin;
  const sData = hasSalaryData ? salaryAgg[0] : null;

  // Find related active jobs (even if they don't have explicit salary data, to funnel users)
  const activeCondition = and(
    eq(jobs.isActive, true),
    or(isNull(jobs.deadline), gt(jobs.deadline, new Date()))
  );
  
  const jobConditions = [
    activeCondition,
    countryId ? eq(jobs.countryId, countryId) : undefined,
    regionId ? eq(jobs.regionId, regionId) : undefined,
    categoryName ? or(
      ilike(jobs.title, '%' + categoryName.replace(/jobs/i, '').trim() + '%'),
      ilike(jobs.profession, '%' + categoryName.replace(/jobs/i, '').trim() + '%')
    ) : undefined,
  ].filter(Boolean);

  const activeJobs = await safeQuery(
    db
      .select({
        job: jobs,
        country: countries.name,
        region: regions.name,
      })
      .from(jobs)
      .leftJoin(countries, eq(jobs.countryId, countries.id))
      .leftJoin(regions, eq(jobs.regionId, regions.id))
      .where(and(...jobConditions))
      .orderBy(desc(jobs.createdAt))
      .limit(10)
  );

  const locParts = [cityName, countryName].filter(Boolean);
  const titleStr = `${categoryName || 'Professional'} Salary in ${locParts.join(', ') || 'East Africa'}`;

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: 'https://akilibrain.com' },
    { name: 'Salaries', url: 'https://akilibrain.com/salaries' },
    { name: titleStr, url: `https://akilibrain.com/salaries/${slugArray.join('/')}` },
  ]);

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8">
      <JsonLd schema={breadcrumbSchema} />
      
      <div className="flex flex-col items-center text-center gap-6 pb-6 border-b border-white/5">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-2">
          <Banknote className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{titleStr}</h1>
        <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
          Based on our analysis of {sData ? sData.count : 0} recently advertised vacancies, discover the compensation benchmarks for {categoryName || 'these roles'} in {countryName || 'the region'}.
        </p>
      </div>

      {hasSalaryData ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="col-span-1 md:col-span-3 bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-500/80 mb-2">Average Monthly Salary</h2>
            <div className="text-4xl md:text-6xl font-black text-foreground mb-4">
              {sData.currency || 'TZS'} {Math.round(sData.avgMin).toLocaleString()}
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Typical range extends to {sData.currency || 'TZS'} {Math.round(sData.avgMax || sData.avgMin).toLocaleString()} based on experience.
            </p>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Entry Level (Est.)</h3>
            <p className="text-2xl font-bold text-foreground">
              {sData.currency || 'TZS'} {Math.round(sData.avgMin * 0.7).toLocaleString()}
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Mid Level</h3>
            <p className="text-2xl font-bold text-foreground">
              {sData.currency || 'TZS'} {Math.round(sData.avgMin).toLocaleString()}
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Senior Level (Est.)</h3>
            <p className="text-2xl font-bold text-foreground">
              {sData.currency || 'TZS'} {Math.round(sData.avgMax || (sData.avgMin * 1.5)).toLocaleString()}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center max-w-3xl mx-auto mb-12">
          <Info className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Insufficient Salary Data</h2>
          <p className="text-muted-foreground">
            We don't currently have enough publicly advertised salary data for {titleStr} to provide an accurate benchmark. 
            Many employers in East Africa do not disclose salaries in job postings.
          </p>
        </div>
      )}

      {/* Funnel to Jobs */}
      <div className="space-y-6 pt-8 border-t border-white/5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Current Vacancies for {categoryName || 'this category'}</h2>
          <Link href={`/jobs/${slugArray.join('/')}`} className="text-primary hover:underline text-sm font-medium">
            View all →
          </Link>
        </div>
        
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
            <p className="text-muted-foreground">No active vacancies found right now. Check back later.</p>
          </div>
        )}
      </div>
      
      {/* Internal Linking Network */}
      <div className="mt-16 bg-white/5 border border-white/10 rounded-xl p-8">
        <h3 className="text-lg font-semibold mb-4">Explore Related Salaries</h3>
        <div className="flex flex-wrap gap-3">
          {countryCode && (
            <Link href={`/salaries/${countryCode.toLowerCase()}/accounting`} className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm hover:bg-primary/20 transition-colors">
              Accounting Salaries in {countryName || 'East Africa'}
            </Link>
          )}
          {countryCode && (
            <Link href={`/salaries/${countryCode.toLowerCase()}/software-engineering`} className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm hover:bg-primary/20 transition-colors">
              Software Engineering Salaries in {countryName || 'East Africa'}
            </Link>
          )}
          {countryCode && (
            <Link href={`/salaries/${countryCode.toLowerCase()}/ngo`} className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm hover:bg-primary/20 transition-colors">
              NGO Salaries in {countryName || 'East Africa'}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
