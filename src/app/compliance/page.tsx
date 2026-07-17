import { db, safeQuery } from '@/lib/db/client';
import { businesses, businessTypes } from '@/lib/db/schema/compliance';
import { countries } from '@/lib/db/schema/shared';
import { eq, desc, ilike, and } from 'drizzle-orm';
import { BusinessCard } from '@/components/compliance/BusinessCard';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Search, SlidersHorizontal, Inbox, Building2, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { complianceRequirements } from '@/lib/db/schema/compliance';
import { ResourceCard } from '@/components/compliance/ResourceCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Business Registry & Compliance',
  description:
    'Search and verify registered businesses across East Africa. Access compliance requirements, permits, and licensing guides for Kenya, Tanzania, Uganda, and Rwanda.',
  keywords: [
    'business registry Kenya',
    'company search East Africa',
    'business compliance Kenya',
    'KRA compliance',
    'company registration Africa',
    'business license Kenya',
    'CAK registration',
    'BRELA Tanzania',
    'URSB Uganda',
    'RDB Rwanda',
  ],
  openGraph: {
    title: 'Business Registry & Compliance',
    description:
      'Search registered companies and verify compliance across African jurisdictions — Kenya, Tanzania, Uganda, Rwanda.',
    url: 'https://akilibrain.com/compliance',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Business Registry & Compliance | AkiliBrain',
    description: 'Search registered companies and verify compliance across East Africa.',
  },
  alternates: {
    canonical: 'https://akilibrain.com/compliance',
  },
};

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const q = params.q || '';
  const status = params.status || 'active';
  
  const conditions = [
    q ? ilike(businesses.name, `%${q}%`) : undefined,
    status && status !== 'all' ? eq(businesses.status, status) : undefined,
  ].filter(Boolean);

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await safeQuery(db
    .select({
      business: businesses,
      country: countries.name,
      type: businessTypes.name,
    })
    .from(businesses)
    .leftJoin(countries, eq(businesses.countryId, countries.id))
    .leftJoin(businessTypes, eq(businesses.typeId, businessTypes.id))
    .where(whereClause)
    .orderBy(desc(businesses.createdAt))
    .limit(20));

  const resources = await safeQuery(db
    .select({
      resource: complianceRequirements,
      country: countries.name,
    })
    .from(complianceRequirements)
    .leftJoin(countries, eq(complianceRequirements.countryId, countries.id))
    .orderBy(desc(complianceRequirements.createdAt))
    .limit(50));

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8">
      {/* Header & Search */}
      <div className="flex flex-col items-center text-center gap-6 border-b border-white/5 pb-10 mb-6">
        <div className="space-y-4 flex flex-col items-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Business Registry</h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            Search registered companies and verify compliance status across African jurisdictions.
          </p>
        </div>
        
        <form className="w-full max-w-md flex items-center gap-2" action="/compliance" method="GET">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              name="q"
              placeholder="Search companies by name..." 
              className="pl-9 bg-white/5 border-white/10 focus-visible:ring-primary/50"
              defaultValue={q}
            />
            {status && status !== 'all' && <input type="hidden" name="status" value={status} />}
          </div>
          <Button variant="outline" size="icon" type="button" className="shrink-0 bg-white/5 border-white/10">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </form>
      </div>

      <Tabs defaultValue="resources" className="w-full">
        <TabsList className="mb-6 bg-white/5 border border-white/10">
          <TabsTrigger value="resources" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BookOpen className="w-4 h-4" />
            Compliance Resources
          </TabsTrigger>
          <TabsTrigger value="businesses" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Building2 className="w-4 h-4" />
            Business Search
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resources" className="space-y-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {['all', 'form', 'calculator', 'guideline', 'notice'].map((t) => (
              <Button key={t} variant="secondary" size="sm" className="rounded-full capitalize">
                {t}
              </Button>
            ))}
          </div>

          {resources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center border border-white/10 rounded-xl bg-white/5 border-dashed">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No resources available</h3>
              <p className="text-muted-foreground max-w-md">
                We are currently indexing compliance resources from authorities.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map(({ resource, country }) => (
                <ResourceCard
                  key={resource.id}
                  title={resource.title}
                  description={resource.description}
                  resourceType={resource.resourceType as any}
                  issuingAuthority={resource.issuingAuthority}
                  sourceUrl={resource.sourceUrl}
                  country={country || 'Unknown'}
                  lastVerifiedAt={resource.lastVerifiedAt}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="businesses" className="space-y-6">
          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {['all', 'active', 'inactive', 'deregistered'].map((s) => (
              <Link key={s} href={`/compliance?${new URLSearchParams({ ...(q ? { q } : {}), ...(s !== 'all' ? { status: s } : {}) }).toString()}`}>
                <Button
                  variant={status === s || (s === 'all' && !status) ? 'default' : 'secondary'}
                  size="sm"
                  className="rounded-full"
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              </Link>
            ))}
          </div>

          {/* Grid */}
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center border border-white/10 rounded-xl bg-white/5 border-dashed">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Inbox className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No businesses found</h3>
              <p className="text-muted-foreground max-w-md">
                We couldn&apos;t find any registered companies matching your search criteria in our database.
              </p>
              {(q || (status && status !== 'all')) && (
                <Link href="/compliance" className={buttonVariants({ variant: "outline", className: "mt-6" })}>
                  Clear all filters
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.map(({ business, country, type }) => (
                <BusinessCard
                  key={business.id}
                  id={business.id}
                  name={business.name}
                  registrationNumber={business.registrationNumber}
                  country={country || 'Unknown'}
                  type={type || undefined}
                  status={business.status}
                  registrationDate={business.registrationDate}
                  directorsCount={business.directors?.length || 0}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
