import { db, safeQuery } from '@/lib/db/client';
import { healthDataPoints, healthIndicators } from '@/lib/db/schema/health';
import { countries } from '@/lib/db/schema/shared';
import { eq, desc, ilike, and } from 'drizzle-orm';
import { HealthCard } from '@/components/health/HealthCard';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Search, SlidersHorizontal, Activity } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Public Health Data Explorer',
  description:
    'Explore interactive public health dashboards, disease statistics, and health indicators across Africa. Data sourced from DHIS2, WHO, and national health ministries.',
  keywords: [
    'public health data Africa',
    'DHIS2 data Kenya',
    'health indicators East Africa',
    'WHO Africa statistics',
    'maternal health Kenya',
    'child health Tanzania',
    'disease surveillance Africa',
    'health dashboard East Africa',
  ],
  openGraph: {
    title: 'Public Health Data Explorer',
    description:
      'Track key health indicators, disease statistics, and outbreaks across East Africa using DHIS2 and WHO data.',
    url: 'https://akilibrain.com/health',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Public Health Data Explorer',
    description: 'Track key health indicators and disease statistics across East Africa.',
  },
  alternates: {
    canonical: 'https://akilibrain.com/health',
  },
};

export default async function HealthPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const q = params.q || '';
  const category = params.category || 'all';
  
  const conditions = [
    q ? ilike(healthIndicators.name, `%${q}%`) : undefined,
    category && category !== 'all' ? eq(healthIndicators.category, category) : undefined,
  ].filter(Boolean);

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await safeQuery(db
    .select({
      dataPoint: healthDataPoints,
      indicator: healthIndicators,
      country: countries.name,
    })
    .from(healthDataPoints)
    .innerJoin(healthIndicators, eq(healthDataPoints.indicatorId, healthIndicators.id))
    .innerJoin(countries, eq(healthDataPoints.countryId, countries.id))
    .where(whereClause)
    .orderBy(desc(healthDataPoints.year), desc(healthDataPoints.createdAt))
    .limit(20));

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Public Health Data</h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Track key health indicators, disease statistics, and outbreaks across jurisdictions.
          </p>
        </div>
        
        <form className="w-full md:w-auto flex items-center gap-2" action="/health" method="GET">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              name="q"
              placeholder="Search indicators..." 
              className="pl-9 bg-white/5 border-white/10 focus-visible:ring-primary/50"
              defaultValue={q}
            />
            {category && category !== 'all' && <input type="hidden" name="category" value={category} />}
          </div>
          <Button variant="outline" size="icon" type="button" className="shrink-0 bg-white/5 border-white/10">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['all', 'maternal', 'child', 'infectious', 'mortality'].map((c) => (
          <Link key={c} href={`/health?${new URLSearchParams({ ...(q ? { q } : {}), ...(c !== 'all' ? { category: c } : {}) }).toString()}`}>
            <Button
              variant={category === c || (c === 'all' && !category) ? 'default' : 'secondary'}
              size="sm"
              className="rounded-full"
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </Button>
          </Link>
        ))}
      </div>

      {/* Grid */}
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center border border-white/10 rounded-xl bg-white/5 border-dashed">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Activity className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No health data found</h3>
          <p className="text-muted-foreground max-w-md">
            We couldn&apos;t find any health indicators matching your search criteria.
          </p>
          {(q || (category && category !== 'all')) && (
            <Link href="/health" className={buttonVariants({ variant: "outline", className: "mt-6" })}>
              Clear all filters
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map(({ dataPoint, indicator, country }) => (
            <HealthCard
              key={dataPoint.id}
              id={dataPoint.id}
              indicatorName={indicator.name}
              category={indicator.category || 'General'}
              country={country || 'Unknown'}
              value={Number(dataPoint.value)}
              unit={indicator.unit || ''}
              year={dataPoint.year}
              source={dataPoint.source || 'DHIS2'}
              updatedAt={dataPoint.createdAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
