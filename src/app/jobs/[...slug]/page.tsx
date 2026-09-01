import { db, safeQuery } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { countries, regions } from '@/lib/db/schema/shared';
import { eq, desc, ilike, and, or, isNull, isNotNull, gt, count, sql, ne } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { JobDetail } from '../JobDetail';
import { JobCard } from '@/components/jobs/JobCard';
import { buildItemListSchema, buildBreadcrumbSchema } from '@/components/seo/schemas';
import { JsonLd } from '@/components/seo/JsonLd';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { ExternalLink, LayoutGrid, List } from 'lucide-react';
import React from 'react';
import { PremiumBanner } from '@/components/shared/PremiumBanner';
import { AdSlot } from '@/components/shared/AdSlot';
import { SearchTracker } from '@/components/analytics/SearchTracker';

export const dynamic = 'force-dynamic';

function isUUID(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function toTitleCase(str: string) {
  return str.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const slugArray = resolvedParams.slug;
  const lastSlug = slugArray[slugArray.length - 1];

  if (isUUID(lastSlug)) {
    // Generate Metadata for Job Detail
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
        .where(eq(jobs.id, lastSlug))
        .limit(1)
    );

    if (!data.length) {
      return { title: 'Job Not Found', robots: { index: false, follow: false } };
    }

    const job = data[0];
    const companyStr = (!job.companyName || job.companyName.toLowerCase() === 'unknown') ? '' : ' at ' + job.companyName;
    const title = job.title + companyStr + ' | Jobs';
    const desc = job.description 
      ? (job.description.slice(0, 150) + (job.description.length > 150 ? '...' : ''))
      : 'Apply for the ' + job.title + ' position' + companyStr + ' in ' + (job.region || job.country || 'East Africa') + '.';

    const url = 'https://akilibrain.com/jobs/' + lastSlug;
    const isExpired = job.deadline ? job.deadline < new Date() : !job.isActive;

    return {
      title,
      description: desc,
      keywords: [job.title, job.companyName, job.region || '', job.country || '', 'job vacancy', 'career'].filter(Boolean),
      openGraph: { title, description: desc, url, type: 'article', publishedTime: job.createdAt.toISOString(), images: [{ url: 'https://akilibrain.com/api/og/jobs/' + lastSlug, width: 1200, height: 630 }] },
      twitter: { card: 'summary_large_image', title, description: desc, images: ['https://akilibrain.com/api/og/jobs/' + lastSlug] },
      alternates: { canonical: url },
      ...(isExpired && { robots: { index: false, follow: false } }),
    };
  } else {
    // SEO Landing Page Metadata
    const COUNTRIES = ['tanzania', 'kenya', 'uganda', 'rwanda', 'ethiopia', 'somalia', 'burundi', 'south-sudan', 'djibouti', 'drc', 'congo'];
    const CITIES = ['dar-es-salaam', 'arusha', 'mwanza', 'dodoma', 'nairobi', 'mombasa', 'kisumu', 'nakuru', 'kampala', 'entebbe', 'jinja', 'gulu', 'kigali', 'musanze', 'rubavu', 'addis-ababa', 'hawassa', 'dire-dawa', 'kinshasa', 'lubumbashi', 'goma', 'bujumbura', 'gitega', 'mogadishu', 'hargeisa', 'juba', 'malakal'];
    const EXPERIENCE = ['entry-level', 'junior', 'mid-level', 'senior', 'manager', 'director', 'executive', 'graduate', 'internship'];
    const EDUCATION = ['diploma', 'degree', 'bachelors', 'masters', 'phd', 'certificate'];

    let parsedCountry = '';
    let parsedCity = '';
    let parsedExperience = '';
    let parsedEducation = '';
    let keywordSlugs: string[] = [];

    for (const slug of slugArray) {
      const s = slug.toLowerCase();
      if (COUNTRIES.includes(s)) parsedCountry = s;
      else if (CITIES.includes(s)) parsedCity = s;
      else if (EXPERIENCE.includes(s)) parsedExperience = s;
      else if (EDUCATION.includes(s)) parsedEducation = s;
      else keywordSlugs.push(slug);
    }

    const countryName = parsedCountry ? toTitleCase(parsedCountry) : '';
    const cityName = parsedCity ? toTitleCase(parsedCity) : '';
    const experienceName = parsedExperience ? toTitleCase(parsedExperience.replace('-', ' ')) : '';
    const educationName = parsedEducation ? toTitleCase(parsedEducation) : '';
    const categoryName = keywordSlugs.map(toTitleCase).join(' ');

    const titleParts = [experienceName, educationName, categoryName, 'Jobs'].filter(Boolean);
    const locParts = [cityName, countryName].filter(Boolean);
    
    const title = titleParts.join(' ') + (locParts.length ? ' in ' + locParts.join(', ') : '');
    
    return {
      title,
      description: 'Find the latest ' + title.toLowerCase() + ' and career opportunities. Salary information, vacancies, and top employers.',
      openGraph: { title, type: 'website' },
      alternates: { canonical: 'https://akilibrain.com/jobs/' + slugArray.join('/') },
    };
  }
}

export default async function SlugRoute({
  params,
  searchParams: rawParams,
}: {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const searchParams = await rawParams;
  const slugArray = resolvedParams.slug;
  const lastSlug = slugArray[slugArray.length - 1];

  if (isUUID(lastSlug)) {
    return <JobDetail id={lastSlug} />;
  }

  // SEO Landing Page Mode
  const COUNTRIES = ['tanzania', 'kenya', 'uganda', 'rwanda', 'ethiopia', 'somalia', 'burundi', 'south-sudan', 'djibouti', 'drc', 'congo'];
  const CITIES = ['dar-es-salaam', 'arusha', 'mwanza', 'dodoma', 'nairobi', 'mombasa', 'kisumu', 'nakuru', 'kampala', 'entebbe', 'jinja', 'gulu', 'kigali', 'musanze', 'rubavu', 'addis-ababa', 'hawassa', 'dire-dawa', 'kinshasa', 'lubumbashi', 'goma', 'bujumbura', 'gitega', 'mogadishu', 'hargeisa', 'juba', 'malakal'];
  const EXPERIENCE = ['entry-level', 'junior', 'mid-level', 'senior', 'manager', 'director', 'executive', 'graduate', 'internship'];
  const EDUCATION = ['diploma', 'degree', 'bachelors', 'masters', 'phd', 'certificate'];

  let parsedCountry = '';
  let parsedCity = '';
  let parsedExperience = '';
  let parsedEducation = '';
  let keywordSlugs: string[] = [];

  for (const slug of slugArray) {
    const s = slug.toLowerCase();
    if (COUNTRIES.includes(s)) parsedCountry = s;
    else if (CITIES.includes(s)) parsedCity = s;
    else if (EXPERIENCE.includes(s)) parsedExperience = s;
    else if (EDUCATION.includes(s)) parsedEducation = s;
    else keywordSlugs.push(slug);
  }

  const countryName = parsedCountry ? toTitleCase(parsedCountry) : '';
  const cityName = parsedCity ? toTitleCase(parsedCity) : '';
  const experienceName = parsedExperience ? toTitleCase(parsedExperience.replace('-', ' ')) : '';
  const educationName = parsedEducation ? toTitleCase(parsedEducation) : '';
  const categoryName = keywordSlugs.map(toTitleCase).join(' ');

  const PAGE_SIZE = 30;
  const pageStr = Array.isArray(searchParams?.page) ? searchParams.page[0] : searchParams?.page;
  const page = parseInt(pageStr || '1', 10) || 1;
  const offset = (page - 1) * PAGE_SIZE;
  const layout = searchParams?.layout === 'list' ? 'list' : 'grid';

  const activeCondition = and(
    eq(jobs.isActive, true),
    or(isNull(jobs.deadline), gt(jobs.deadline, new Date()))
  );

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
    activeCondition,
    countryId ? eq(jobs.countryId, countryId) : undefined,
    regionId ? eq(jobs.regionId, regionId) : undefined,
    categoryName ? or(
      ilike(jobs.title, '%' + categoryName.replace(/jobs/i, '').trim() + '%'),
      ilike(jobs.companyName, '%' + categoryName.replace(/jobs/i, '').trim() + '%')
    ) : undefined,
    experienceName ? ilike(jobs.title, '%' + experienceName + '%') : undefined,
    educationName ? ilike(jobs.requirements, '%' + educationName + '%') : undefined
  ].filter(Boolean);

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalCountResult, data] = await Promise.all([
    safeQuery(db.select({ value: count() }).from(jobs).where(whereClause)),
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
        .where(whereClause)
        .orderBy(desc(jobs.createdAt))
        .limit(PAGE_SIZE)
        .offset(offset)
    )
  ]);

  // Aggregate Insights (Top Employers & Skills)
  let topEmployers: { name: string, count: number }[] = [];
  let avgSalaryStr = "";
  
  if (data.length > 0 && page === 1) {
    try {
      const employerAgg = await safeQuery(
        db.select({
          companyName: jobs.companyName,
          jobCount: count()
        })
        .from(jobs)
        .where(and(whereClause, ne(jobs.companyName, 'Unknown'), ne(jobs.companyName, '')))
        .groupBy(jobs.companyName)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(5)
      );
      if (employerAgg && employerAgg.length > 0) {
        topEmployers = employerAgg.map(e => ({ name: e.companyName || 'Unknown', count: e.jobCount }));
      }
      
      const salaryAgg = await safeQuery(
        db.select({
          avgMin: sql<number>`AVG(CAST(${jobs.salaryMin} AS NUMERIC))`,
          avgMax: sql<number>`AVG(CAST(${jobs.salaryMax} AS NUMERIC))`,
          currency: jobs.salaryCurrency
        })
        .from(jobs)
        .where(and(whereClause, isNotNull(jobs.salaryMin)))
        .groupBy(jobs.salaryCurrency)
        .limit(1)
      );
      
      if (salaryAgg && salaryAgg.length > 0 && salaryAgg[0].avgMin) {
        const s = salaryAgg[0];
        avgSalaryStr = `${s.currency || 'TZS'} ${Math.round(s.avgMin).toLocaleString()} - ${s.currency || 'TZS'} ${Math.round(s.avgMax || s.avgMin).toLocaleString()}`;
      }
    } catch (e) {
      console.error("Aggregation failed", e);
    }
  }

  const totalCount = totalCountResult?.[0]?.value || 0;
  
  const titleParts = [experienceName, educationName, categoryName, 'Jobs'].filter(Boolean);
  const locParts = [cityName, countryName].filter(Boolean);
  const titleStr = titleParts.join(' ') + (locParts.length ? ' in ' + locParts.join(', ') : '');

  const itemListSchema = buildItemListSchema(
    titleStr,
    'Active job openings for ' + titleStr,
    data.slice(0, 20).map(({ job, country }, idx) => ({
      position: idx + 1,
      name: job.title + ' at ' + job.companyName,
      description: job.description?.slice(0, 120) ?? undefined,
      url: 'https://akilibrain.com/jobs/' + job.id,
    }))
  );

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: 'https://akilibrain.com' },
    { name: 'Jobs', url: 'https://akilibrain.com/jobs' },
    { name: titleStr, url: 'https://akilibrain.com/jobs/' + slugArray.join('/') },
  ]);

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8">
      <JsonLd schema={itemListSchema} />
      <JsonLd schema={breadcrumbSchema} />
      
      <div className="flex flex-col items-center text-center gap-6 pb-6 border-b border-white/5">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{titleStr}</h1>
        <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
          {totalCount} active vacancies found. Explore top employers, required qualifications, and salary trends for {titleStr}.
        </p>
      </div>
      
      {/* Dynamic Intelligence Dashboard */}
      {(topEmployers.length > 0 || avgSalaryStr) && page === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 bg-white/5 border border-white/10 rounded-xl p-6">
          {avgSalaryStr && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Average Advertised Salary</h3>
              <p className="text-xl font-bold text-emerald-400">{avgSalaryStr}</p>
            </div>
          )}
          {topEmployers.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Top Employers Hiring</h3>
              <div className="flex flex-wrap gap-2">
                {topEmployers.map(emp => (
                  <span key={emp.name} className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-md">
                    {emp.name} ({emp.count})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-lg">
          <Link
            href={`?layout=grid`}
            className={`p-1.5 rounded-md transition-colors ${layout === 'grid' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </Link>
          <Link
            href={`?layout=list`}
            className={`p-1.5 rounded-md transition-colors ${layout === 'list' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
          >
            <List className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {data.length > 0 ? (
        <div className={layout === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-3"}>
          {data.map(({ job, country, region }, idx) => (
            <React.Fragment key={job.id}>
              <JobCard
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
                layout={layout}
              />
              {idx === 2 && (
                <div className={layout === 'grid' ? "col-span-1 md:col-span-2 lg:col-span-3" : "w-full"}>
                  <PremiumBanner />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <h3 className="text-xl font-semibold mb-2">No active jobs found</h3>
          <p className="text-muted-foreground">Try adjusting your category or checking back later.</p>
        </div>
      )}

      {/* Pagination */}
      {data.length > 0 && (
        <div className="flex items-center justify-center gap-4 pt-6 border-t border-white/5 mt-8">
          {page > 1 && (
            <Link
              href={`?layout=${layout}&page=${page - 1}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              ← Previous
            </Link>
          )}
          <span className="text-sm text-muted-foreground">Page {page}</span>
          {data.length === PAGE_SIZE && (
            <Link
              href={`?layout=${layout}&page=${page + 1}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Next →
            </Link>
          )}
        </div>
      )}
      
      {/* Dynamic SEO Content Block */}
      <section className="mt-16 space-y-8 text-muted-foreground border-t border-white/5 pt-12">
        <div className="border border-white/10 rounded-xl p-6 bg-white/5">
          <h2 className="text-2xl font-bold text-foreground mb-4">Finding {titleStr}</h2>
          <p className="leading-relaxed mb-4">
            The market for {categoryName ? categoryName.toLowerCase() : 'jobs'} in {countryName || 'East Africa'} is highly competitive. 
            Ensure your CV is tailored for Applicant Tracking Systems (ATS) and highlights relevant experience.
          </p>
          <p className="leading-relaxed">
            AkiliBrain aggregates these roles daily, giving you the fastest access to new opportunities. Check our salary intelligence tools to benchmark your expected compensation before your interview.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-white/10 rounded-xl p-6 bg-white/5">
            <h2 className="text-xl font-semibold text-foreground mb-3">Salary Expectations</h2>
            <p className="text-sm mb-4">
              Salaries for {categoryName ? categoryName.toLowerCase() : 'these'} roles in {countryName || 'East Africa'} vary based on experience, employer type, and specific city.
            </p>
            <ul className="space-y-2 text-sm list-disc list-inside">
              <li><strong>Entry-level:</strong> Often lower, but provides critical experience.</li>
              <li><strong>Mid-level:</strong> Significant salary jumps once you have 3-5 years of specialized experience.</li>
              <li><strong>Senior:</strong> Highly competitive, especially in multinational companies and top NGOs.</li>
            </ul>
            <div className="mt-4">
              <Link href={`/salaries/${slugArray.join('/')}`} className="text-primary hover:underline text-sm font-medium">
                View detailed {categoryName || 'job'} salary data in {countryName || 'East Africa'} →
              </Link>
            </div>
          </div>
          
          <div className="border border-white/10 rounded-xl p-6 bg-white/5">
            <h2 className="text-xl font-semibold text-foreground mb-3">Popular Employers & Cities</h2>
            <p className="text-sm mb-4">
              Top opportunities are typically concentrated in major commercial hubs like Dar es Salaam, Nairobi, Kigali, and Kampala.
            </p>
            <ul className="space-y-2 text-sm list-disc list-inside">
              <li><strong>International NGOs & UN Agencies</strong></li>
              <li><strong>Commercial Banks & Financial Institutions</strong></li>
              <li><strong>Telecommunications & Tech Companies</strong></li>
              <li><strong>Government & Parastatals</strong></li>
            </ul>
            <div className="mt-4 text-sm font-medium">
              <span className="text-muted-foreground">Required Qualifications often include: </span>
              Relevant Bachelor&apos;s degree, professional certifications, and proven track record.
            </div>
          </div>
        </div>

        {/* AI CV Matcher Pitch */}
        <div className="border border-primary/20 rounded-xl p-8 bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-foreground mb-3">Match Your CV to {titleStr}</h2>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl">
              Upload your CV and our AI will instantly calculate your match percentage for these roles, suggest improvements, and help you generate a customized cover letter.
            </p>
            <div className="flex flex-wrap gap-4 items-center">
              <Link href="/login?redirect=/dashboard/cv-analyzer" className={buttonVariants({ size: "lg", className: "rounded-full shadow-lg shadow-primary/20" })}>
                Analyze My CV
              </Link>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                Instant Feedback
              </div>
            </div>
          </div>
          {/* Background decoration */}
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        <div className="border border-white/10 rounded-xl p-6 bg-white/5">
            <h2 className="text-xl font-semibold text-foreground mb-3">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground">How often are these {categoryName || 'jobs'} in {countryName || 'East Africa'} updated?</h3>
                <p className="text-sm mt-1">We update our database multiple times a day. As soon as a new position is posted by a verified employer, it appears here.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Can I find remote opportunities in this category?</h3>
                <p className="text-sm mt-1">Yes, use the &quot;Job Type&quot; filter at the top of the page to specifically view remote positions available in your location.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Do I need an account to apply?</h3>
                <p className="text-sm mt-1">You can view job details without an account, but creating a free profile unlocks our AI CV analyzer and application assistant to improve your chances.</p>
              </div>
            </div>
            <div className="mt-6 text-xs text-muted-foreground pt-4 border-t border-white/10">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
        </div>
      </section>
    </div>
  );
}
