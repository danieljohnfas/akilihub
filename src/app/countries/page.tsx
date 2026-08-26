import { db, safeQuery } from '@/lib/db/client';
import { countries } from '@/lib/db/schema/shared';
import { jobs } from '@/lib/db/schema/jobs';
import { tenders } from '@/lib/db/schema/tenders';
import { eq, count } from 'drizzle-orm';
import Link from 'next/link';
import { Globe, Briefcase, FileText, ArrowRight } from 'lucide-react';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbSchema } from '@/components/seo/schemas';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Countries | East Africa Intelligence — AkiliBrain',
  description:
    'Explore jobs, government tenders, business compliance, and health data across all 9 East African countries on AkiliBrain: Kenya, Tanzania, Uganda, Rwanda, Ethiopia, Somalia, South Sudan, DRC, and Burundi.',
  alternates: { canonical: 'https://akilibrain.com/countries' },
  openGraph: {
    title: 'Country Profiles | AkiliBrain',
    description: 'East Africa intelligence across 9 countries — tenders, jobs, compliance, health, and salaries.',
    url: 'https://akilibrain.com/countries',
    type: 'website',
  },
};

export const revalidate = 3600; // Cache for 1 hour

const COUNTRY_FLAGS: Record<string, string> = {
  KE: '🇰🇪',
  TZ: '🇹🇿',
  UG: '🇺🇬',
  RW: '🇷🇼',
  ET: '🇪🇹',
  SO: '🇸🇴',
  SS: '🇸🇸',
  CD: '🇨🇩',
  BI: '🇧🇮',
};

const COUNTRY_SLUGS: Record<string, string> = {
  Kenya: 'kenya',
  Tanzania: 'tanzania',
  Uganda: 'uganda',
  Rwanda: 'rwanda',
  Ethiopia: 'ethiopia',
  Somalia: 'somalia',
  'South Sudan': 'south-sudan',
  'Democratic Republic of the Congo': 'democratic-republic-of-the-congo',
  Burundi: 'burundi',
};

const COUNTRY_TAGLINES: Record<string, string> = {
  KE: 'Silicon Savannah — East Africa\'s tech & finance hub',
  TZ: 'Gateway to Southern & Eastern Africa',
  UG: 'The Pearl of Africa — fast-growing startup scene',
  RW: 'The Land of a Thousand Hills — innovation capital',
  ET: 'Africa\'s fastest-growing economy',
  SO: 'Horn of Africa — growing trade & reconstruction',
  SS: 'East Africa\'s youngest nation — development opportunities',
  CD: 'Central Africa\'s natural resource powerhouse',
  BI: 'Heart of Africa — emerging market economy',
};

export default async function CountriesPage() {
  const allCountries = await safeQuery(
    db.select().from(countries).orderBy(countries.name)
  );

  // Fetch job and tender counts per country
  const [jobCounts, tenderCounts] = await Promise.all([
    safeQuery(
      db.select({ countryId: jobs.countryId, value: count() })
        .from(jobs)
        .where(eq(jobs.isActive, true))
        .groupBy(jobs.countryId)
    ),
    safeQuery(
      db.select({ countryId: tenders.countryId, value: count() })
        .from(tenders)
        .where(eq(tenders.status, 'open'))
        .groupBy(tenders.countryId)
    ),
  ]);

  const jobCountMap: Record<string, number> = {};
  jobCounts.forEach((r) => { if (r.countryId) jobCountMap[r.countryId] = Number(r.value); });

  const tenderCountMap: Record<string, number> = {};
  tenderCounts.forEach((r) => { if (r.countryId) tenderCountMap[r.countryId] = Number(r.value); });

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: 'https://akilibrain.com' },
    { name: 'Countries', url: 'https://akilibrain.com/countries' },
  ]);

  return (
    <div className="container py-12 max-w-6xl mx-auto space-y-12">
      <JsonLd schema={breadcrumbSchema} />

      {/* Header */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center ring-1 ring-primary/30 mx-auto">
          <Globe className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          East Africa Countries
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
          Explore jobs, government tenders, business compliance requirements, salary data,
          and health intelligence across all {allCountries.length || 9} countries on the platform.
        </p>
      </div>

      {/* Country Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {allCountries.map((country) => {
          const flag = COUNTRY_FLAGS[country.code] ?? '🌍';
          const slug = COUNTRY_SLUGS[country.name] ?? country.name.toLowerCase().replace(/\s+/g, '-');
          const tagline = COUNTRY_TAGLINES[country.code] ?? '';
          const jobCount = jobCountMap[country.id] ?? 0;
          const tenderCount = tenderCountMap[country.id] ?? 0;

          return (
            <Link
              key={country.id}
              href={`/countries/${slug}`}
              className="group flex flex-col gap-4 p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{flag}</span>
                  <div>
                    <h2 className="font-bold text-lg leading-tight">{country.name}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{tagline}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
              </div>

              <div className="flex gap-4 pt-2 border-t border-white/5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Briefcase className="w-4 h-4 text-amber-400/70" />
                  <span>
                    <span className="font-semibold text-foreground">{jobCount.toLocaleString()}</span> jobs
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="w-4 h-4 text-blue-400/70" />
                  <span>
                    <span className="font-semibold text-foreground">{tenderCount.toLocaleString()}</span> open tenders
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* SEO block */}
      <section className="mt-16 space-y-4 text-muted-foreground border-t border-white/5 pt-12 text-sm leading-relaxed">
        <h2 className="text-xl font-semibold text-foreground">About Our Country Coverage</h2>
        <p>
          AkiliBrain provides comprehensive professional intelligence for 9 East and Central African countries:
          Kenya, Tanzania, Uganda, Rwanda, Ethiopia, Somalia, South Sudan, the Democratic Republic of the Congo, and Burundi.
          Each country profile aggregates government tender notices, job vacancies, business compliance requirements,
          salary benchmarks, and public health data from authoritative sources — updated daily.
        </p>
        <p>
          Whether you are a procurement officer tracking bids, a job seeker exploring opportunities abroad,
          a business setting up operations across the region, or a health professional working with national data systems,
          AkiliBrain gives you a single trusted source for actionable East African intelligence.
        </p>
      </section>
    </div>
  );
}
